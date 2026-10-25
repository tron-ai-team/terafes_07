package com.tronai.career.cvbuilder.gotenberg;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class GotenbergPdfClientValidateTest {

    @Test
    void acceptsValidPdfMagic() {
        byte[] pdf = new byte[200];
        pdf[0] = '%';
        pdf[1] = 'P';
        pdf[2] = 'D';
        pdf[3] = 'F';
        assertDoesNotThrow(() -> GotenbergPdfClient.validatePdf(pdf));
    }

    @Test
    void rejectsEmpty() {
        assertThatThrownBy(() -> GotenbergPdfClient.validatePdf(new byte[0]))
                .isInstanceOf(GotenbergException.class);
    }

    @Test
    void rejectsNonPdf() {
        byte[] junk = "not-a-pdf-document-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx".getBytes();
        assertThatThrownBy(() -> GotenbergPdfClient.validatePdf(junk))
                .isInstanceOf(GotenbergException.class);
    }
}
