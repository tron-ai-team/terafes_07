package com.tronai.desktop.policy;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Encrypts one-time pairing material and the per-device approval key at rest.
 * The database stores ciphertext, not the device credential.
 */
public final class SecretBox {

    private static final int GCM_TAG_BITS = 128;
    private static final int IV_BYTES = 12;

    private SecretBox() {
    }

    public static String seal(String serverSecret, String bindingId, String plaintext) {
        try {
            byte[] iv = new byte[IV_BYTES];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key(serverSecret, bindingId), new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] packed = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, packed, 0, iv.length);
            System.arraycopy(encrypted, 0, packed, iv.length, encrypted.length);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(packed);
        } catch (Exception e) {
            throw new IllegalStateException("Could not seal secret");
        }
    }

    public static String open(String serverSecret, String bindingId, String sealed) {
        try {
            byte[] packed = Base64.getUrlDecoder().decode(sealed);
            byte[] iv = new byte[IV_BYTES];
            byte[] encrypted = new byte[packed.length - IV_BYTES];
            System.arraycopy(packed, 0, iv, 0, IV_BYTES);
            System.arraycopy(packed, IV_BYTES, encrypted, 0, encrypted.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(serverSecret, bindingId), new GCMParameterSpec(GCM_TAG_BITS, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalArgumentException("Could not open sealed secret");
        }
    }

    private static SecretKeySpec key(String serverSecret, String bindingId) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] material = digest.digest((serverSecret + ":" + bindingId).getBytes(StandardCharsets.UTF_8));
        return new SecretKeySpec(material, "AES");
    }
}

