package com.tronai.cv.extractor;

import com.tronai.cv.CvException;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.util.List;

@Component
public class DocxDocumentTextExtractor implements DocumentTextExtractor {

    private static final Logger log = LoggerFactory.getLogger(DocxDocumentTextExtractor.class);

    public static final int MAX_DOCX_BYTES = 5 * 1024 * 1024;
    public static final int MIN_DOCX_TEXT_CHARS = 20;

    @Override
    public boolean supports(String filename, String contentType) {
        String name = filename != null ? filename.toLowerCase() : "";
        String type = contentType != null ? contentType.split(";")[0].trim().toLowerCase() : "";
        boolean isDocxName = name.endsWith(".docx");
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document".equals(type)
                || (isDocxName && ("application/octet-stream".equals(type) || type.isEmpty()));
    }

    @Override
    public ExtractedDocument extract(byte[] data, String filename) {
        if (data == null || data.length == 0) {
            throw new CvException(HttpStatus.BAD_REQUEST, "The file is not a valid DOCX document");
        }
        if (data.length > MAX_DOCX_BYTES) {
            throw new CvException(HttpStatus.PAYLOAD_TOO_LARGE, "DOCX exceeds the 5MB limit");
        }
        try (ByteArrayInputStream in = new ByteArrayInputStream(data);
             XWPFDocument document = new XWPFDocument(in)) {
            StringBuilder sb = new StringBuilder();
            List<XWPFParagraph> paragraphs = document.getParagraphs();
            for (XWPFParagraph paragraph : paragraphs) {
                if (paragraph.getText() != null && !paragraph.getText().isBlank()) {
                    sb.append(paragraph.getText().strip()).append('\n');
                }
            }
            String text = sb.toString().strip();
            if (text.length() < MIN_DOCX_TEXT_CHARS) {
                throw new CvException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "Could not extract enough text from the DOCX document.");
            }
            return new ExtractedDocument(text, 1, text.length());
        } catch (CvException e) {
            throw e;
        } catch (Exception e) {
            log.info("DOCX structure could not be read: {}", e.getMessage());
            throw new CvException(HttpStatus.BAD_REQUEST, "The DOCX structure could not be read");
        }
    }
}
