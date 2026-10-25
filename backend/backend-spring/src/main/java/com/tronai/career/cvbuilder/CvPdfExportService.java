package com.tronai.career.cvbuilder;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

/**
 * PDF export: tries LibreOffice headless for XLSX fidelity; falls back to PDFBox text layout.
 */
@Component
public class CvPdfExportService {

    private static final Logger log = LoggerFactory.getLogger(CvPdfExportService.class);

    public record PdfResult(byte[] bytes, String fidelityNote) {}

    public PdfResult fromXlsx(byte[] xlsxBytes, String basename) {
        byte[] viaLibre = tryLibreOffice(xlsxBytes, basename);
        if (viaLibre != null) {
            return new PdfResult(viaLibre, "pdf_via_libreoffice");
        }
        return new PdfResult(fallbackTextPdf("Exported from " + basename + ". XLSX layout preserved in .xlsx download; PDF is text summary only."),
                "pdf_fallback_pdfbox_low_fidelity");
    }

    /**
     * High-fidelity path only — returns null when LibreOffice is unavailable.
     * Used by Gotenberg integration so PDFBox text dumps are never treated as professional PDFs.
     */
    public PdfResult fromXlsxHighFidelityOnly(byte[] xlsxBytes, String basename) {
        byte[] viaLibre = tryLibreOffice(xlsxBytes, basename);
        if (viaLibre == null) {
            return null;
        }
        return new PdfResult(viaLibre, "pdf_via_local_libreoffice_fallback");
    }

    public PdfResult fromPlainText(String text) {
        return new PdfResult(fallbackTextPdf(text), "pdf_fallback_pdfbox");
    }

    private byte[] tryLibreOffice(byte[] xlsx, String basename) {
        try {
            Path dir = Files.createTempDirectory("cv-pdf-");
            Path in = dir.resolve(basename + ".xlsx");
            Files.write(in, xlsx);
            ProcessBuilder pb = new ProcessBuilder(
                    "soffice", "--headless", "--convert-to", "pdf", "--outdir", dir.toString(), in.toString());
            pb.redirectErrorStream(true);
            Process p = pb.start();
            if (!p.waitFor(90, TimeUnit.SECONDS)) {
                p.destroyForcibly();
                return null;
            }
            Path pdf = dir.resolve(basename + ".pdf");
            if (Files.exists(pdf)) {
                return Files.readAllBytes(pdf);
            }
        } catch (Exception e) {
            log.debug("LibreOffice PDF conversion unavailable: {}", e.getMessage());
        }
        return null;
    }

    private byte[] fallbackTextPdf(String text) {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(font, 11);
                cs.newLineAtOffset(50, 750);
                for (String line : text.split("\\R")) {
                    cs.showText(line.length() > 90 ? line.substring(0, 90) : line);
                    cs.newLineAtOffset(0, -14);
                }
                cs.endText();
            }
            doc.save(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("PDF generation failed", e);
        }
    }
}
