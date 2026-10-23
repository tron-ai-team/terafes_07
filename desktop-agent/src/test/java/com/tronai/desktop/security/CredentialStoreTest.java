package com.tronai.desktop.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class CredentialStoreTest {

    @Test
    void testStableDeviceUuidAcrossLoads(@TempDir Path tempDir) throws Exception {
        Path file = tempDir.resolve("identity.json");
        CredentialStore store1 = new CredentialStore(file);
        store1.loadOrCreate();

        String uuid1 = store1.deviceUuid();
        assertThat(uuid1).isNotBlank();
        assertThat(uuid1).matches("[0-9a-fA-F-]{36}");
        assertThat(store1.isPaired()).isFalse();

        // Second load with fresh store instance pointing to same file
        CredentialStore store2 = new CredentialStore(file);
        store2.loadOrCreate();
        assertThat(store2.deviceUuid()).isEqualTo(uuid1);
    }

    @Test
    void testCorruptFileRecoverySafely(@TempDir Path tempDir) throws Exception {
        Path file = tempDir.resolve("identity.json");
        Files.writeString(file, "{ this is corrupted json ::: !!!");

        CredentialStore store = new CredentialStore(file);
        store.loadOrCreate();

        assertThat(store.deviceUuid()).isNotBlank();
        assertThat(store.publicKeyPem()).contains("BEGIN PUBLIC KEY");
        assertThat(store.isPaired()).isFalse();
    }

    @Test
    void testPartialPairingCleanup(@TempDir Path tempDir) throws Exception {
        Path file = tempDir.resolve("identity.json");
        CredentialStore store = new CredentialStore(file);
        store.loadOrCreate();
        // Set credential without approvalKey (partial pairing)
        store.putSecret("credential", "test-token");
        assertThat(store.isPaired()).isFalse();

        // Reload should detect partial state and clean it
        CredentialStore store2 = new CredentialStore(file);
        store2.loadOrCreate();
        assertThat(store2.credential()).isNull();
        assertThat(store2.approvalKey()).isNull();
        assertThat(store2.isPaired()).isFalse();
    }

    @Test
    void resetLocalIdentityChangesUuidAndKeepsWorkspace(@TempDir Path tempDir) throws Exception {
        Path file = tempDir.resolve("identity.json");
        CredentialStore store = new CredentialStore(file);
        store.loadOrCreate();
        String original = store.deviceUuid();
        store.putSecret("allowedWorkspace", "C:/Dev");
        store.putSecret("coreUrl", "ws://127.0.0.1:8080/api/v1/desktop-agent/ws");
        store.putSecret("credential", "old-credential");
        store.putSecret("approvalKey", "old-approval");

        store.resetLocalIdentity();
        assertThat(store.deviceUuid()).isNotEqualTo(original);
        assertThat(store.isPaired()).isFalse();
        assertThat(store.allowedWorkspace()).isEqualTo("C:/Dev");
        assertThat(store.coreUrl()).contains("8080");

        CredentialStore reloaded = new CredentialStore(file);
        reloaded.loadOrCreate();
        assertThat(reloaded.deviceUuid()).isEqualTo(store.deviceUuid());
        assertThat(reloaded.isPaired()).isFalse();
    }
}
