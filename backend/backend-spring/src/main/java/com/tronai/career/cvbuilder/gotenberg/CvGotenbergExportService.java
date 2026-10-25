package com.tronai.career.cvbuilder.gotenberg;

import com.tronai.career.cvbuilder.CvPdfExportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Primary CV PDF pipeline: office bytes → Gotenberg → validated PDF.
 * Optional local LibreOffice fallback only when it yields a valid PDF (never PDFBox text dump).
 */
@Service
public class CvGotenbergExportService {

    private static final Logger log = LoggerFactory.getLogger(CvGotenbergExportService.class);

    private final GotenbergPdfClient gotenbergPdfClient;
    private final GotenbergProperties properties;
    private final CvPdfExportService localLibreOfficeBridge;

    public CvGotenbergExportService(GotenbergPdfClient gotenbergPdfClient,
                                    GotenbergProperties properties,
                                    CvPdfExportService localLibreOfficeBridge) {
        this.gotenbergPdfClient = gotenbergPdfClient;
        this.properties = properties;
        this.localLibreOfficeBridge = localLibreOfficeBridge;
    }

    public record PdfExportResult(byte[] bytes, String engineNote) {}

    public boolean isGotenbergAvailable() {
        return gotenbergPdfClient.isAvailable();
    }

    public PdfExportResult convertOfficeDocument(byte[] officeBytes, String filename) {
        try {
            byte[] pdf = gotenbergPdfClient.convertLibreOffice(officeBytes, filename);
            return new PdfExportResult(pdf, "gotenberg_libreoffice");
        } catch (GotenbergException primary) {
            if (properties.isAllowLocalLibreOfficeFallback() && primary.isUnavailable()) {
                CvPdfExportService.PdfResult local = localLibreOfficeBridge.fromXlsxHighFidelityOnly(officeBytes, stripExt(filename));
                if (local != null && local.bytes() != null) {
                    try {
                        GotenbergPdfClient.validatePdf(local.bytes());
                        log.warn("Gotenberg unavailable; used local LibreOffice PDF fallback");
                        return new PdfExportResult(local.bytes(), local.fidelityNote());
                    } catch (GotenbergException ignored) {
                        // fall through
                    }
                }
            }
            throw primary;
        }
    }

    private static String stripExt(String name) {
        if (name == null) return "cv";
        int dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }
}
