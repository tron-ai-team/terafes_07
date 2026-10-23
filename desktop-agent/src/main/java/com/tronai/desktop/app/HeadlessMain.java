package com.tronai.desktop.app;

import com.tronai.desktop.security.CredentialStore;

/**
 * Same agent runtime as the JavaFX app, without a window.
 * Prints the pairing code and connection status. Credentials are not printed.
 */
public final class HeadlessMain {

    private HeadlessMain() {
    }

    public static void main(String[] args) throws Exception {
        CredentialStore store = new CredentialStore(CredentialStore.defaultFile());
        AgentRuntime runtime = new AgentRuntime(store, new AgentRuntime.AgentUi() {
            @Override
            public void status(String connection, String detail) {
                System.out.println("STATUS=" + connection);
            }

            @Override
            public void pairingCode(String code) {
                System.out.println("PAIRING_CODE=" + code);
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
        runtime.startPairingCodeFlow();
        runtime.start();
        while (runtime.isRunning()) {
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }
}
