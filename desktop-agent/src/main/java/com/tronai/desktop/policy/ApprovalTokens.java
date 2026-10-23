package com.tronai.desktop.policy;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

/**
 * HMAC binds an approval to one device, task, action, and fingerprint.
 * The desktop agent verifies this with the approval key issued at pairing.
 */
public final class ApprovalTokens {

    private ApprovalTokens() {
    }

    public static String mac(String approvalKeyBase64Url, String deviceUuid, String taskId,
                             String actionId, String fingerprint, String expiresAtEpochMillis) {
        String data = String.join("\n",
                nullToEmpty(deviceUuid),
                nullToEmpty(taskId),
                nullToEmpty(actionId),
                nullToEmpty(fingerprint),
                nullToEmpty(expiresAtEpochMillis));
        try {
            byte[] key = Base64.getUrlDecoder().decode(approvalKeyBase64Url);
            Mac hmac = Mac.getInstance("HmacSHA256");
            hmac.init(new SecretKeySpec(key, "HmacSHA256"));
            byte[] signed = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(signed);
        } catch (Exception e) {
            throw new IllegalArgumentException("Approval token could not be signed");
        }
    }

    public static boolean matches(String expected, String actual) {
        if (expected == null || actual == null) {
            return false;
        }
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8));
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}

