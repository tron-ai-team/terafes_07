package com.tronai.cv.extractor;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;

import static org.junit.jupiter.api.Assertions.*;

class DocxDocumentTextExtractorTest {

    @Test
    void extractsDocxText() throws Exception {
        try (XWPFDocument doc = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            doc.createParagraph().createRun().setText("Java Spring Boot engineer with five years experience.");
            doc.write(out);
            DocxDocumentTextExtractor extractor = new DocxDocumentTextExtractor();
            ExtractedDocument extracted = extractor.extract(out.toByteArray(), "cv.docx");
            assertTrue(extracted.getText().contains("Spring Boot"));
        }
    }
}
