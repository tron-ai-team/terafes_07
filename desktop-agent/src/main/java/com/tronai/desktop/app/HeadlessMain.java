package com.tronai.desktop.app;

import com.tronai.desktop.security.CredentialStore;

/**
 * Same agent runtime as the JavaFX app, without a window.
 * Prints the pairing code and connection status. Credentials are not printed.
 * Uses the same single-instance lock as the GUI so a second HeadlessMain cannot
 * reconnect with the same identity and abort in-flight native tasks.
 */
public final class HeadlessMain {

    private HeadlessMain() {
    }

    public static void main(String[] args) throws Exception {
        // Must acquire BEFORE any WSS connect. Shares mutex port + file lock with DesktopAgentApp.
        SingleInstanceManager singleInstance = new SingleInstanceManager();
        if (!singleInstance.acquireOrSignal()) {
            System.out.println("HEADLESS_EXIT reason=another_instance_holds_identity_mutex port="
                    + singleInstance.mutexPort());
            System.exit(0);
            return;
        }
        Runtime.getRuntime().addShutdownHook(new Thread(singleInstance::close));
        System.out.println("HEADLESS_MUTEX_ACQUIRED port=" + singleInstance.mutexPort()
                + " dir=" + singleInstance.baseDir());

        CredentialStore store = new CredentialStore(CredentialStore.defaultFile());
        AgentRuntime runtime = new AgentRuntime(store, new AgentRuntime.AgentUi() {
            @Override
            public void status(String connection, String detail) {
                System.out.println("STATUS=" + connection + (detail == null || detail.isBlank() ? "" : (" detail=" + detail)));
            }

            @Override
            public void pairingCode(String code) {
                System.out.println("PAIRING_CODE=" + code);
            }

            @Override
            public void logEvent(String message) {
                if (message != null && !message.isBlank()) {
                    System.out.println("LOG=" + message);
                }
            }

            @Override
            public void approval(String taskId, String action, String risk, java.util.function.Consumer<Boolean> decision) {
                // Never silent-approve. Default: defer to Core/web approval API.
                // Set TRON_HEADLESS_APPROVAL=deny|approve for non-interactive CI.
                String mode = System.getenv("TRON_HEADLESS_APPROVAL");
                if (mode == null || mode.isBlank()) {
                    System.out.println("APPROVAL_REQUIRED task=" + taskId + " risk=" + risk + " decision=DEFER");
                    return;
                }
                boolean allow = "approve".equalsIgnoreCase(mode.trim());
                System.out.println("APPROVAL_REQUIRED task=" + taskId + " risk=" + risk + " decision=" + (allow ? "APPROVE" : "DENY"));
                if (decision != null) {
                    decision.accept(allow);
                }
            }
        });
        Runtime.getRuntime().addShutdownHook(new Thread(runtime::shutdown));
        runtime.start();
        // Only request pairing when not already credentialed — avoid disrupting golden headless reconnects.
        if (!runtime.isPaired()) {
            runtime.startPairingCodeFlow();
        }
        System.out.println("HEADLESS_READY paired=" + runtime.isPaired() + " device=" + runtime.deviceUuid());
        while (runtime.isRunning()) {
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        System.out.println("HEADLESS_EXIT");
    }
}
