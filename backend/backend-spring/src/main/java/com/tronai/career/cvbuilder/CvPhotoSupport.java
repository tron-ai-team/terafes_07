package com.tronai.career.cvbuilder;

import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * CV photo validation and data-URI embedding helpers.
 * Does not log image bytes.
 */
public final class CvPhotoSupport {

    public static final long MAX_BYTES = 2L * 1024 * 1024;
    public static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png");

    private CvPhotoSupport() {}

    public record PhotoData(byte[] bytes, String contentType) {}

    public static PhotoData validateAndNormalize(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo file is required");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Photo must be 2MB or smaller");
        }
        byte[] raw;
        try {
            raw = file.getBytes();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to read photo file");
        }
        String detected = detectImageType(raw);
        if (detected == null) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Photo must be a real JPEG or PNG image");
        }
        String declared = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!declared.isBlank() && !ALLOWED_TYPES.contains(declared) && !"image/jpg".equals(declared)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Photo must be JPEG or PNG");
        }
        // Re-encode via ImageIO to drop exotic payloads / normalize for Chromium.
        try {
            BufferedImage img = ImageIO.read(new ByteArrayInputStream(raw));
            if (img == null || img.getWidth() < 40 || img.getHeight() < 40) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Photo is too small or unreadable (min 40x40)");
            }
            if (img.getWidth() > 8000 || img.getHeight() > 8000) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo dimensions are too large");
            }
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            String format = "image/png".equals(detected) ? "png" : "jpg";
            if (!ImageIO.write(toRgb(img), format.equals("png") ? "png" : "jpeg", bos)) {
                // fallback: store original validated bytes
                return new PhotoData(raw, detected);
            }
            return new PhotoData(bos.toByteArray(), format.equals("png") ? "image/png" : "image/jpeg");
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid image content");
        }
    }

    public static String toDataUri(byte[] bytes, String contentType) {
        if (bytes == null || bytes.length == 0) return null;
        String type = contentType == null ? detectImageType(bytes) : contentType;
        if (type == null) type = "image/jpeg";
        return "data:" + type + ";base64," + Base64.getEncoder().encodeToString(bytes);
    }

    public static String detectImageType(byte[] bytes) {
        if (bytes == null || bytes.length < 8) return null;
        // JPEG
        if ((bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        // PNG
        if ((bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47) {
            return "image/png";
        }
        return null;
    }

    /**
     * Center-crop to Japanese CV ID photo aspect ratio 3:4 (30mm × 40mm) without stretching.
     * Returns original bytes if decode fails.
     */
    public static byte[] fitIdPhoto(byte[] bytes) {
        if (bytes == null || bytes.length < 50) return bytes;
        try {
            BufferedImage src = ImageIO.read(new ByteArrayInputStream(bytes));
            if (src == null || src.getWidth() < 10 || src.getHeight() < 10) return bytes;
            double target = 3.0 / 4.0;
            int w = src.getWidth();
            int h = src.getHeight();
            double current = (double) w / (double) h;
            int cropW = w;
            int cropH = h;
            int x = 0;
            int y = 0;
            if (current > target) {
                // too wide — crop sides
                cropW = (int) Math.round(h * target);
                x = Math.max(0, (w - cropW) / 2);
            } else if (current < target) {
                // too tall — crop top/bottom slightly toward upper third (face bias)
                cropH = (int) Math.round(w / target);
                y = Math.max(0, (h - cropH) / 5);
                if (y + cropH > h) y = Math.max(0, h - cropH);
            }
            BufferedImage cropped = src.getSubimage(x, y, Math.min(cropW, w - x), Math.min(cropH, h - y));
            // Normalize pixel size for print (~300 DPI of 30×40mm ≈ 354×472)
            int outW = 354;
            int outH = 472;
            BufferedImage out = new BufferedImage(outW, outH, BufferedImage.TYPE_INT_RGB);
            java.awt.Graphics2D g = out.createGraphics();
            g.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION,
                    java.awt.RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setColor(java.awt.Color.WHITE);
            g.fillRect(0, 0, outW, outH);
            g.drawImage(toRgb(cropped), 0, 0, outW, outH, null);
            g.dispose();
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            if (!ImageIO.write(out, "jpeg", bos)) return bytes;
            return bos.toByteArray();
        } catch (Exception e) {
            return bytes;
        }
    }

    /** Payload photo policy for Japanese CV. */
    public static boolean isPhotoIncluded(Map<String, Object> payload) {
        if (payload == null) return true;
        Object v = payload.get("photoIncluded");
        if (v == null) return true; // default: include when available
        if (v instanceof Boolean b) return b;
        return !"false".equalsIgnoreCase(String.valueOf(v).trim());
    }

    public static String draftPhotoKey(Map<String, Object> payload) {
        if (payload == null) return "";
        Object v = payload.get("cvPhotoObjectKey");
        return v == null ? "" : String.valueOf(v).trim();
    }

    private static BufferedImage toRgb(BufferedImage src) {
        if (src.getType() == BufferedImage.TYPE_INT_RGB) return src;
        BufferedImage rgb = new BufferedImage(src.getWidth(), src.getHeight(), BufferedImage.TYPE_INT_RGB);
        rgb.getGraphics().drawImage(src, 0, 0, java.awt.Color.WHITE, null);
        return rgb;
    }
}
