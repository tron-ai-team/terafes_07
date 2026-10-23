package com.tronai.desktop.app;

import com.tronai.desktop.security.CredentialStore;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Reliable single-instance detection and window restoration across processes.
 * Holds an OS file lock on instance.lock and communicates with secondary launches via loopback socket.
 */
public final class SingleInstanceManager implements AutoCloseable {

    private final Path lockFile;
    private final Path portFile;
    private final Path requestFile;
    private FileChannel channel;
    private FileLock lock;
    private ServerSocket serverSocket;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private volatile Runnable onShowRequested;

    public SingleInstanceManager() {
        this(resolveBaseDir());
    }

    public SingleInstanceManager(Path baseDir) {
        Path base = baseDir != null ? baseDir : resolveBaseDir();
        this.lockFile = base.resolve("instance.lock");
        this.portFile = base.resolve("instance.port");
        this.requestFile = base.resolve("show.request");
    }

    private static Path resolveBaseDir() {
        Path identity = CredentialStore.defaultFile();
        Path base = identity.getParent();
        return base == null ? Path.of(".") : base;
    }

    public Path requestFile() {
        return requestFile;
    }

    public Path lockFile() {
        return lockFile;
    }

    /**
     * Tries to acquire the primary instance lock.
     * If another instance holds the lock, notifies that instance to restore its window
     * and returns false so the caller can cleanly exit.
     */
    public boolean acquireOrSignal() {
        try {
            Files.createDirectories(lockFile.getParent());
            channel = FileChannel.open(lockFile, StandardOpenOption.CREATE, StandardOpenOption.WRITE);
            lock = channel.tryLock();
            if (lock == null) {
                channel.close();
                signalRunningInstance();
                return false;
            }
            startServer();
            running.set(true);
            return true;
        } catch (Exception e) {
            signalRunningInstance();
            return false;
        }
    }

    public void setOnShowRequested(Runnable onShowRequested) {
        this.onShowRequested = onShowRequested;
    }

    public void triggerShow() {
        Runnable callback = onShowRequested;
        if (callback != null) {
            callback.run();
        }
    }

    private void signalRunningInstance() {
        boolean signaled = false;
        if (Files.exists(portFile)) {
            try {
                String portStr = Files.readString(portFile, StandardCharsets.UTF_8).trim();
                int port = Integer.parseInt(portStr);
                try (Socket socket = new Socket(InetAddress.getLoopbackAddress(), port);
                     PrintWriter writer = new PrintWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8), true);
                     BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8))) {
                    socket.setSoTimeout(3000);
                    writer.println("SHOW");
                    String reply = reader.readLine();
                    if ("OK".equals(reply)) {
                        signaled = true;
                    }
                }
            } catch (Exception ignored) {
                // Socket connection failed; fallback to file signal
            }
        }
        try {
            Files.writeString(requestFile, Instant.now().toString(), StandardCharsets.UTF_8);
            signaled = true;
        } catch (Exception ignored) {
        }
        if (signaled) {
            System.out.println("[TRON Desktop Agent] Existing instance detected. Requested window restore.");
        }
    }

    private void startServer() {
        try {
            serverSocket = new ServerSocket(0, 10, InetAddress.getLoopbackAddress());
            int port = serverSocket.getLocalPort();
            Files.writeString(portFile, Integer.toString(port), StandardCharsets.UTF_8);
            Thread listener = new Thread(this::listenLoop, "tron-instance-listener");
            listener.setDaemon(true);
            listener.start();
        } catch (Exception ignored) {
            // Socket bind failed, file lock still holds
        }
    }

    private void listenLoop() {
        while (!serverSocket.isClosed()) {
            try {
                Socket client = serverSocket.accept();
                handleClient(client);
            } catch (Exception e) {
                if (serverSocket.isClosed()) {
                    break;
                }
            }
        }
    }

    private void handleClient(Socket client) {
        try (client;
             BufferedReader reader = new BufferedReader(new InputStreamReader(client.getInputStream(), StandardCharsets.UTF_8));
             PrintWriter writer = new PrintWriter(new OutputStreamWriter(client.getOutputStream(), StandardCharsets.UTF_8), true)) {
            client.setSoTimeout(2000);
            String line = reader.readLine();
            if (line != null && line.trim().equalsIgnoreCase("SHOW")) {
                triggerShow();
                writer.println("OK");
            } else {
                writer.println("UNKNOWN");
            }
        } catch (Exception ignored) {
        }
    }

    @Override
    public void close() {
        running.set(false);
        try {
            if (serverSocket != null && !serverSocket.isClosed()) {
                serverSocket.close();
            }
        } catch (Exception ignored) {}
        try {
            Files.deleteIfExists(portFile);
        } catch (Exception ignored) {}
        try {
            Files.deleteIfExists(requestFile);
        } catch (Exception ignored) {}
        try {
            if (lock != null && lock.isValid()) {
                lock.release();
            }
        } catch (Exception ignored) {}
        try {
            if (channel != null && channel.isOpen()) {
                channel.close();
            }
        } catch (Exception ignored) {}
    }
}
