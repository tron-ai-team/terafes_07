package com.tronai.career.cvbuilder;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class CvPhotoSupportTest {

    @Test
    void acceptsJpegAndProducesDataUri() throws Exception {
        byte[] jpeg = solidJpeg(120, 160);
        MockMultipartFile file = new MockMultipartFile("file", "a.jpg", "image/jpeg", jpeg);
        CvPhotoSupport.PhotoData data = CvPhotoSupport.validateAndNormalize(file);
        assertNotNull(data.bytes());
        assertTrue(data.bytes().length > 50);
        String uri = CvPhotoSupport.toDataUri(data.bytes(), data.contentType());
        assertTrue(uri.startsWith("data:image/"));
        assertTrue(uri.contains("base64,"));
    }

    @Test
    void rejectsNonImageBytes() {
        MockMultipartFile file = new MockMultipartFile("file", "a.jpg", "image/jpeg", "not-an-image".getBytes());
        assertThrows(ResponseStatusException.class, () -> CvPhotoSupport.validateAndNormalize(file));
    }

    @Test
    void rejectsOversized() {
        byte[] big = new byte[(int) CvPhotoSupport.MAX_BYTES + 10];
        big[0] = (byte) 0xFF;
        big[1] = (byte) 0xD8;
        big[2] = (byte) 0xFF;
        MockMultipartFile file = new MockMultipartFile("file", "a.jpg", "image/jpeg", big);
        assertThrows(ResponseStatusException.class, () -> CvPhotoSupport.validateAndNormalize(file));
    }

    @Test
    void photoIncludedDefaultsTrue() {
        assertTrue(CvPhotoSupport.isPhotoIncluded(Map.of()));
        assertFalse(CvPhotoSupport.isPhotoIncluded(Map.of("photoIncluded", false)));
    }

    @Test
    void fitIdPhotoCropsToThreeByFour() throws Exception {
        byte[] wide = solidJpeg(400, 200);
        byte[] fitted = CvPhotoSupport.fitIdPhoto(wide);
        assertNotNull(fitted);
        BufferedImage img = ImageIO.read(new java.io.ByteArrayInputStream(fitted));
        assertEquals(354, img.getWidth());
        assertEquals(472, img.getHeight());
        assertEquals(0.75, img.getWidth() / (double) img.getHeight(), 0.01);
    }

    private static byte[] solidJpeg(int w, int h) throws Exception {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(new Color(40, 90, 160));
        g.fillRect(0, 0, w, h);
        g.setColor(Color.WHITE);
        g.fillOval(w / 4, h / 8, w / 2, h / 3);
        g.dispose();
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        ImageIO.write(img, "jpeg", bos);
        return bos.toByteArray();
    }
}
