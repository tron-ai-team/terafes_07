package com.tronai.cv.extractor;

import com.tronai.cv.CvException;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Composite extractor delegating to specialized DocumentTextExtractor implementations.
 */
@Component
@Primary
public class CompositeDocumentTextExtractor implements DocumentTextExtractor {

    private final List<DocumentTextExtractor> extractors;

    public CompositeDocumentTextExtractor(List<DocumentTextExtractor> extractors) {
        this.extractors = extractors != null ? extractors : List.of();
    }

    @Override
    public boolean supports(String filename, String contentType) {
        for (DocumentTextExtractor extractor : extractors) {
            if (extractor != this && extractor.supports(filename, contentType)) {
                return true;
            }
        }
        return false;
    }

    @Override
    public ExtractedDocument extract(byte[] data, String filename) {
        for (DocumentTextExtractor extractor : extractors) {
            if (extractor != this && extractor.supports(filename, null)) {
                return extractor.extract(data, filename);
            }
        }
        throw new CvException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Only PDF or DOCX files are accepted");
    }

    public ExtractedDocument extract(byte[] data, String filename, String contentType) {
        for (DocumentTextExtractor extractor : extractors) {
            if (extractor != this && extractor.supports(filename, contentType)) {
                return extractor.extract(data, filename);
            }
        }
        throw new CvException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Only PDF or DOCX files are accepted");
    }
}
