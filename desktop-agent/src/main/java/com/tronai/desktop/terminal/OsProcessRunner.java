package com.tronai.desktop.terminal;

import com.tronai.desktop.protocol.ProtocolMessage;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.BiConsumer;

/**
 * Starts processes without a user-supplied shell string.
 * Windows resolves PATH and PATHEXT. A project mvnw or gradlew is used only when
 * mvn or gradle is not installed and the wrapper sits inside the working directory.
 * Batch files are started through cmd.exe /d /s /c because Windows cannot CreateProcess them.
 * Linux consults PATH, then the same project wrapper.
 */
public final class OsProcessRunner {

    private final AtomicBoolean cancel = new AtomicBoolean();
    private volatile Process current;
    private volatile String taskId;

    public boolean windows() {
        return System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("win");
    }

    public void bindTask(String taskId) {
        this.taskId = taskId;
    }

    public void cancelCurrent() {
        cancel.set(true);
        destroyTree(current);
    }

    public ProtocolMessage.Result run(List<String> argv, Path workingDirectory, int timeoutMs, BiConsumer<String, String> output) {
        cancel.set(false);
        long started = System.nanoTime();
        ProtocolMessage.Result result = new ProtocolMessage.Result();
        List<String> resolved;
        try {
            resolved = resolve(argv, workingDirectory);
        } catch (IOException e) {
            result.setSuccess(false);
            result.setSummary("Command was not found: " + argv.get(0));
            result.setStderr(e.getMessage());
            return result;
        }
        ProcessBuilder builder = new ProcessBuilder(resolved);
        builder.directory(workingDirectory.toFile());
        builder.environment().keySet().removeIf(key -> {
            String upper = key.toUpperCase(Locale.ROOT);
            return upper.contains("SECRET") || upper.contains("PASSWORD") || upper.contains("TOKEN")
                    || upper.contains("CREDENTIAL") || upper.equals("JWT_SECRET");
        });
        try {
            Process process = builder.start();
            current = process;
            StringBuilder stdout = new StringBuilder();
            StringBuilder stderr = new StringBuilder();
            Thread outThread = stream(process.getInputStream(), "stdout", stdout, output);
            Thread errThread = stream(process.getErrorStream(), "stderr", stderr, output);
            boolean finished = process.waitFor(Math.max(timeoutMs, 1000), java.util.concurrent.TimeUnit.MILLISECONDS);
            if (!finished || cancel.get()) {
                destroyTree(process);
                result.setTimedOut(!cancel.get());
                result.setCancelled(cancel.get());
                result.setSuccess(false);
                result.setSummary(cancel.get() ? "Command cancelled" : "Command timed out");
            } else {
                result.setExitCode(process.exitValue());
                result.setSuccess(process.exitValue() == 0);
                result.setSummary(process.exitValue() == 0 ? "Command finished" : "Command failed with exit " + process.exitValue());
            }
            outThread.join(2000);
            errThread.join(2000);
            result.setStdout(stdout.toString());
            result.setStderr(stderr.toString());
            result.setDurationMs((System.nanoTime() - started) / 1_000_000L);
            result.setProcessId(process.pid());
            return result;
        } catch (Exception e) {
            result.setSuccess(false);
            result.setSummary("Command could not be started: " + argv.get(0));
            result.setStderr(e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage());
            return result;
        } finally {
            current = null;
        }
    }

    public Owned startDetached(List<String> argv, Path workingDirectory, String taskId) throws IOException {
        List<String> resolved = resolve(argv, workingDirectory);
        ProcessBuilder builder = new ProcessBuilder(resolved);
        builder.directory(workingDirectory.toFile());
        Process process = builder.start();
        return new Owned(process, taskId, String.join(" ", argv), workingDirectory.toString());
    }

    public static void destroyTree(Process process) {
        if (process == null) {
            return;
        }
        process.descendants().forEach(handle -> handle.destroyForcibly());
        if (System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("win")) {
            try {
                new ProcessBuilder("taskkill", "/PID", Long.toString(process.pid()), "/T", "/F")
                        .redirectErrorStream(true)
                        .start()
                        .waitFor(5, java.util.concurrent.TimeUnit.SECONDS);
            } catch (Exception ignored) {
                process.destroyForcibly();
            }
        } else {
            process.destroyForcibly();
        }
    }

    private Thread stream(InputStream input, String name, StringBuilder buffer, BiConsumer<String, String> output) {
        Thread thread = new Thread(() -> {
            byte[] chunk = new byte[4096];
            try (input) {
                int read;
                while ((read = input.read(chunk)) >= 0) {
                    String text = new String(chunk, 0, read, StandardCharsets.UTF_8);
                    synchronized (buffer) {
                        if (buffer.length() < 64_000) {
                            buffer.append(text);
                        }
                    }
                    if (output != null) {
                        output.accept(name, text);
                    }
                }
            } catch (IOException ignored) {
                // The process ended.
            }
        }, "tron-" + name);
        thread.setDaemon(true);
        thread.start();
        return thread;
    }

    List<String> resolve(List<String> argv, Path workingDirectory) throws IOException {
        if (argv == null || argv.isEmpty()) {
            throw new IOException("Command is empty");
        }
        String executable = argv.get(0);
        Path direct = Path.of(executable);
        if (direct.isAbsolute() || executable.contains("/") || executable.contains("\\")) {
            Path candidate = direct.isAbsolute() ? direct : workingDirectory.resolve(direct);
            if (!Files.exists(candidate)) {
                throw new IOException("Executable does not exist");
            }
            List<String> copy = new ArrayList<>(argv);
            copy.set(0, candidate.toAbsolutePath().normalize().toString());
            return copy;
        }
        if (!windows()) {
            if (unixExecutableExists(executable)) {
                return argv;
            }
            Path wrapper = projectWrapper(executable, workingDirectory, false);
            if (wrapper == null) {
                return argv;
            }
            List<String> copy = new ArrayList<>(argv);
            copy.set(0, wrapper.toString());
            return copy;
        }
        Path found = searchWindowsPath(executable, workingDirectory);
        if (found == null) {
            found = projectWrapper(executable, workingDirectory, true);
        }
        if (found == null) {
            throw new IOException(executable + " was not found on PATH");
        }
        if (isBatch(found)) {
            rejectBatchMetacharacters(found, argv);
            String commandLine = quote(found.toString());
            for (int i = 1; i < argv.size(); i++) {
                commandLine = commandLine + " " + quote(argv.get(i));
            }
            return List.of(cmdExe(), "/d", "/s", "/c", commandLine);
        }
        List<String> copy = new ArrayList<>(argv);
        copy.set(0, found.toString());
        return copy;
    }

    private Path projectWrapper(String executable, Path workingDirectory, boolean windows) {
        String alias = switch (executable.toLowerCase(Locale.ROOT)) {
            case "mvn", "mvn.cmd", "mvn.bat" -> "mvnw";
            case "gradle", "gradle.bat" -> "gradlew";
            default -> null;
        };
        if (alias == null) {
            return null;
        }
        Path root = workingDirectory.toAbsolutePath().normalize();
        if (windows) {
            Path found = searchDirectory(alias, root);
            if (found != null && found.startsWith(root)) {
                return found;
            }
            return null;
        }
        Path candidate = root.resolve(alias).normalize();
        if (Files.isRegularFile(candidate) && candidate.startsWith(root)) {
            return candidate;
        }
        return null;
    }

    private boolean unixExecutableExists(String executable) {
        String path = System.getenv("PATH");
        if (path == null) {
            return false;
        }
        for (String dir : path.split(":")) {
            if (!dir.isBlank() && Files.isExecutable(Path.of(dir, executable))) {
                return true;
            }
        }
        return false;
    }

    private static boolean isBatch(Path executable) {
        String name = executable.getFileName().toString().toLowerCase(Locale.ROOT);
        return name.endsWith(".cmd") || name.endsWith(".bat");
    }

    private static void rejectBatchMetacharacters(Path executable, List<String> argv) throws IOException {
        rejectBatchText(executable.toString());
        for (int i = 1; i < argv.size(); i++) {
            rejectBatchText(argv.get(i));
        }
    }

    private static void rejectBatchText(String value) throws IOException {
        if (value == null) {
            return;
        }
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (c == '&' || c == '|' || c == '<' || c == '>' || c == '^' || c == '%' || c == '!'
                    || c == '"' || c == '\n' || c == '\r') {
                throw new IOException("Command argument is not allowed in a Windows batch launch");
            }
        }
    }

    private static String quote(String value) {
        if (value.indexOf(' ') < 0 && value.indexOf('\t') < 0) {
            return value;
        }
        return "\"" + value + "\"";
    }

    private static String cmdExe() {
        String root = System.getenv("SystemRoot");
        if (root == null || root.isBlank()) {
            root = "C:\\Windows";
        }
        return root + "\\System32\\cmd.exe";
    }

    private Path searchWindowsPath(String name, Path workingDirectory) {
        List<String> directories = new ArrayList<>();
        directories.add(workingDirectory.toString());
        String path = System.getenv("PATH");
        if (path != null) {
            for (String dir : path.split(";")) {
                if (!dir.isBlank()) {
                    directories.add(dir);
                }
            }
        }
        // Prefer PATHEXT (.cmd/.bat/.exe) before an extensionless name. Apache Maven
        // ships a Unix shell script named "mvn" next to mvn.cmd; CreateProcess on that
        // script returns ERROR_BAD_EXE_FORMAT (193).
        List<String> extensions = windowsPathExtensions();
        for (String directory : directories) {
            Path found = searchDirectory(name, Path.of(directory), extensions);
            if (found != null) {
                return found;
            }
        }
        return null;
    }

    private Path searchDirectory(String name, Path directory) {
        return searchDirectory(name, directory, windowsPathExtensions());
    }

    private static List<String> windowsPathExtensions() {
        List<String> extensions = new ArrayList<>();
        String pathExt = System.getenv("PATHEXT");
        if (pathExt != null) {
            for (String ext : pathExt.split(";")) {
                if (ext != null && !ext.isBlank()) {
                    extensions.add(ext);
                }
            }
        }
        if (extensions.isEmpty()) {
            extensions.add(".COM");
            extensions.add(".EXE");
            extensions.add(".BAT");
            extensions.add(".CMD");
        }
        extensions.add("");
        return extensions;
    }

    private static Path searchDirectory(String name, Path directory, List<String> extensions) {
        for (String extension : extensions) {
            Path candidate = directory.resolve(name + extension);
            if (Files.isRegularFile(candidate)) {
                return candidate.toAbsolutePath().normalize();
            }
        }
        return null;
    }

    public String currentTaskId() {
        return taskId;
    }

    public record Owned(Process process, String taskId, String command, String workingDirectory) {
    }
}
