package com.tronai.desktop.app;

import com.tronai.desktop.security.CredentialStore;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.InetAddress;
import java.net.InetSocketAddress;
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
 * Cross-process single-instance guard shared by DesktopAgentApp (GUI) and HeadlessMain.
 *
 * <p>Primary mutex: exclusive loopback {@link ServerSocket} bind on a port derived from the
 * identity directory. This cannot be bypassed by deleting {@code instance.lock} on Windows
 * (a common failure mode that previously allowed GUI + Headless to both connect WSS).
 *
 * <p>Secondary mutex: OS file lock on {@code instance.lock} in the identity directory.
 * Signaling of a second launch uses the existing SHOW socket protocol / show.request file.
 */
public final class SingleInstanceManager implements AutoCloseable {

    /** Base port for identity-scoped mutex; + hash offset keeps test temp dirs isolated. */
    public static final int BASE_MUTEX_PORT = 47821;

    private final Path baseDir;
    private final Path lockFile;
    private final Path portFile;
    private final Path requestFile;
    private final int mutexPort;

    private ServerSocket mutexSocket;
    private FileChannel channel;
    private FileLock lock;
    private ServerSocket signalServerSocket;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private volatile Runnable onShowRequested;

    public SingleInstanceManager() {
        this(resolveBaseDir());
    }

    public SingleInstanceManager(Path baseDir) {
        Path base = baseDir != null ? baseDir : resolveBaseDir();
        this.baseDir = base;
        this.lockFile = base.resolve("instance.lock");
        this.portFile = base.resolve("instance.port");
        this.requestFile = base.resolve("show.request");
        this.mutexPort = mutexPortFor(base);
    }

    private static Path resolveBaseDir() {
        Path identity = CredentialStore.defaultFile();
        Path base = identity.getParent();
        return base == null ? Path.of(".") : base;
    }

    /** Stable loopback port for this identity directory (GUI and Headless must agree). */
    public static int mutexPortFor(Path baseDir) {
        Path abs = baseDir == null ? Path.of(".") : baseDir.toAbsolutePath().normalize();
        int offset = Math.floorMod(abs.toString().toLowerCase().hashCode(), 1000);
        return BASE_MUTEX_PORT + offset;
    }

    public int mutexPort() {
        return mutexPort;
    }

    public Path requestFile() {
        return requestFile;
    }

    public Path lockFile() {
        return lockFile;
    }

    public Path baseDir() {
        return baseDir;
    }

    /**
     * Tries to become the sole Desktop Agent for this identity.
     * Returns false when another process already holds the mutex (signals it to restore UI).
     */
    public boolean acquireOrSignal() {
        try {
            Files.createDirectories(lockFile.getParent());

            // 1) Exclusive loopback port — cannot be defeated by deleting instance.lock.
            mutexSocket = new ServerSocket();
            mutexSocket.setReuseAddress(false);
            try {
                mutexSocket.bind(new InetSocketAddress(InetAddress.getLoopbackAddress(), mutexPort));
            } catch (Exception bindFail) {
                closeQuietly(mutexSocket);
                mutexSocket = null;
                signalRunningInstance();
                return false;
            }

            // 2) File lock — belt-and-suspenders; if it fails after port bind, still treat as owner
            //    only when file lock is free. If file lock is held by a zombie name, port bind already
            //    proved uniqueness for this identity path.
            channel = FileChannel.open(lockFile, StandardOpenOption.CREATE, StandardOpenOption.WRITE);
            lock = channel.tryLock();
            if (lock == null) {
                // Another JVM holds the file lock (should also hold the port). Yield.
                closeQuietly(channel);
                channel = null;
                closeQuietly(mutexSocket);
                mutexSocket = null;
                signalRunningInstance();
                return false;
            }

            startSignalServer();
            running.set(true);
            return true;
        } catch (Exception e) {
            close();
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

    /** True when the identity mutex port is already bound (another agent is alive). */
    public static boolean isMutexHeld(Path baseDir) {
        int port = mutexPortFor(baseDir);
        try (Socket probe = new Socket()) {
            probe.connect(new InetSocketAddress(InetAddress.getLoopbackAddress(), port), 400);
            return true;
        } catch (Exception e) {
            return false;
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

    private void startSignalServer() {
        try {
            signalServerSocket = new ServerSocket(0, 10, InetAddress.getLoopbackAddress());
            int port = signalServerSocket.getLocalPort();
            Files.writeString(portFile, Integer.toString(port), StandardCharsets.UTF_8);
            Thread listener = new Thread(this::listenLoop, "tron-instance-listener");
            listener.setDaemon(true);
            listener.start();
        } catch (Exception ignored) {
            // Signal socket optional; mutex port + file lock still hold
        }
    }

    private void listenLoop() {
        while (signalServerSocket != null && !signalServerSocket.isClosed()) {
            try {
                Socket client = signalServerSocket.accept();
                handleClient(client);
            } catch (Exception e) {
                if (signalServerSocket == null || signalServerSocket.isClosed()) {
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
        closeQuietly(signalServerSocket);
        signalServerSocket = null;
        try {
            Files.deleteIfExists(portFile);
        } catch (Exception ignored) {
        }
        try {
            Files.deleteIfExists(requestFile);
        } catch (Exception ignored) {
        }
        try {
            if (lock != null && lock.isValid()) {
                lock.release();
            }
        } catch (Exception ignored) {
        }
        lock = null;
        closeQuietly(channel);
        channel = null;
        closeQuietly(mutexSocket);
        mutexSocket = null;
    }

    private static void closeQuietly(ServerSocket socket) {
        if (socket == null) {
            return;
        }
        try {
            socket.close();
        } catch (Exception ignored) {
        }
    }

    private static void closeQuietly(FileChannel ch) {
        if (ch == null) {
            return;
        }
        try {
            ch.close();
        } catch (Exception ignored) {
        }
    }
}
