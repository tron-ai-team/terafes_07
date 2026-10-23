package com.tronai.desktop.security;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Stores the device private key and credential outside the project workspace.
 * Windows: %LOCALAPPDATA%\TRON\desktop-agent\identity.json with a user-only
 * ACL.
 * Linux: ~/.config/tron-desktop-agent/identity.json with mode 600.
 * The file contents are never logged.
 */
public final class CredentialStore {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private final Path file;
    private Map<String, String> values = new LinkedHashMap<>();

    public CredentialStore(Path file) {
        this.file = file;
    }

    public static Path defaultFile() {
        String override = System.getenv("TRON_IDENTITY_FILE");
        if (override != null && !override.isBlank()) {
            return Path.of(override);
        }
        String os = System.getProperty("os.name", "").toLowerCase();
        if (os.contains("win")) {
            String local = System.getenv("LOCALAPPDATA");
            Path base = local == null || local.isBlank()
                    ? Path.of(System.getProperty("user.home"), "AppData", "Local")
                    : Path.of(local);
            return base.resolve("TRON").resolve("desktop-agent").resolve("identity.json");
        }
        return Path.of(System.getProperty("user.home"), ".config", "tron-desktop-agent", "identity.json");
    }

    public void loadOrCreate() throws Exception {
        boolean dirty = false;
        if (Files.exists(file)) {
            try {
                byte[] raw = Files.readAllBytes(file);
                if (raw.length > 0) {
                    @SuppressWarnings("unchecked")
                    Map<String, String> loaded = MAPPER.readValue(raw, Map.class);
                    if (loaded != null) {
                        values = new LinkedHashMap<>(loaded);
                    }
                }
            } catch (Exception e) {
                // Recover safely from corrupt/incomplete identity file
                try {
                    Path backup = file
                            .resolveSibling(file.getFileName().toString() + ".corrupt." + System.currentTimeMillis());
                    Files.copy(file, backup);
                } catch (Exception ignored) {
                }
                values = new LinkedHashMap<>();
                dirty = true;
            }
        }
        if (blank(values.get("deviceUuid"))) {
            values.put("deviceUuid", UUID.randomUUID().toString());
            dirty = true;
        }
        if (blank(values.get("privateKeyPkcs8Base64")) || blank(values.get("publicKeyPem"))) {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("Ed25519");
            KeyPair pair = generator.generateKeyPair();
            values.put("publicKeyPem", pem("PUBLIC KEY", pair.getPublic().getEncoded()));
            values.put("privateKeyPkcs8Base64", Base64.getEncoder().encodeToString(pair.getPrivate().getEncoded()));
            dirty = true;
        }
        // Incomplete / partial pairing state cleanup
        if (blank(values.get("credential")) != blank(values.get("approvalKey"))) {
            values.remove("credential");
            values.remove("approvalKey");
            values.remove("deviceId");
            dirty = true;
        }
        if (dirty || !Files.exists(file)) {
            save();
        }
    }

    public void clearPairing() throws Exception {
        values.remove("credential");
        values.remove("approvalKey");
        values.remove("deviceId");
        save();
    }

    /**
     * Replaces this installation's device UUID and key pair.
     * Core URL and allowed workspace are kept. This does not run on startup.
     */
    public void resetLocalIdentity() throws Exception {
        values.remove("credential");
        values.remove("approvalKey");
        values.remove("deviceId");
        values.put("deviceUuid", UUID.randomUUID().toString());
        KeyPairGenerator generator = KeyPairGenerator.getInstance("Ed25519");
        KeyPair pair = generator.generateKeyPair();
        values.put("publicKeyPem", pem("PUBLIC KEY", pair.getPublic().getEncoded()));
        values.put("privateKeyPkcs8Base64", Base64.getEncoder().encodeToString(pair.getPrivate().getEncoded()));
        save();
    }

    public void save() throws Exception {
        Files.createDirectories(file.getParent());
        byte[] json = MAPPER.writerWithDefaultPrettyPrinter().writeValueAsBytes(values);
        Files.write(file, json);
        restrictPermissions();
    }

    public String deviceUuid() {
        return values.get("deviceUuid");
    }

    public String publicKeyPem() {
        return values.get("publicKeyPem");
    }

    public String credential() {
        return values.get("credential");
    }

    public String approvalKey() {
        return values.get("approvalKey");
    }

    public String deviceId() {
        return values.get("deviceId");
    }

    public String allowedWorkspace() {
        String env = System.getenv("TRON_WORKSPACE");
        if (env != null && !env.isBlank()) {
            return env.trim();
        }
        return values.get("allowedWorkspace");
    }

    public String coreUrl() {
        String env = System.getenv("TRON_CORE_URL");
        if (env != null && !env.isBlank()) {
            return env.trim();
        }
        return values.get("coreUrl");
    }

    public void putSecret(String key, String value) throws Exception {
        if (value == null) {
            values.remove(key);
        } else {
            values.put(key, value);
        }
        save();
    }

    public boolean isPaired() {
        return !blank(credential()) && !blank(approvalKey());
    }

    public boolean isHideToTrayWithoutPrompt() {
        return "true".equalsIgnoreCase(values.get("hideToTrayWithoutPrompt"));
    }

    public void setHideToTrayWithoutPrompt(boolean hide) throws Exception {
        putSecret("hideToTrayWithoutPrompt", Boolean.toString(hide));
    }

    private void restrictPermissions() {
        try {
            String os = System.getProperty("os.name", "").toLowerCase();
            if (os.contains("win")) {
                String user = System.getProperty("user.name");
                new ProcessBuilder("icacls", file.toString(), "/inheritance:r", "/grant:r", user + ":(R,W)")
                        .redirectErrorStream(true)
                        .start()
                        .waitFor();
            } else {
                Files.setPosixFilePermissions(file,
                        Set.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE));
                Files.setPosixFilePermissions(file.getParent(), Set.of(
                        PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE,
                        PosixFilePermission.OWNER_EXECUTE));
            }
        } catch (Exception ignored) {
            // The credential still lives outside the workspace. Permission tightening is
            // best-effort.
        }
    }

    private static String pem(String type, byte[] encoded) {
        String body = Base64.getMimeEncoder(64, new byte[] { '\n' }).encodeToString(encoded);
        return "-----BEGIN " + type + "-----\n" + body + "\n-----END " + type + "-----\n";
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
