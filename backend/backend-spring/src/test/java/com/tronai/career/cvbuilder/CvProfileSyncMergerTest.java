package com.tronai.career.cvbuilder;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CvProfileSyncMergerTest {

    @Test
    void fillBlankPreservesManualEditsAndFillsEmpty() {
        Map<String, Object> draft = new LinkedHashMap<>();
        draft.put("fullName", "Manual Name");
        draft.put("email", "");
        draft.put("selfPr", "手動で書いた自己PR");
        draft.put("education", List.of(Map.of("schoolName", "Manual Uni")));
        draft.put("hobbies", "読書");

        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("fullName", "Profile Name");
        profile.put("email", "p@example.com");
        profile.put("selfPr", "プロフィール自己PR");
        profile.put("education", List.of(Map.of("schoolName", "Profile Uni")));
        profile.put("phone", "09012345678");

        CvProfileSyncMerger.MergeResult result = CvProfileSyncMerger.merge(
                draft, profile, CvProfileSyncMerger.Mode.FILL_BLANK);

        assertThat(result.payload().get("fullName")).isEqualTo("Manual Name");
        assertThat(result.payload().get("email")).isEqualTo("p@example.com");
        assertThat(result.payload().get("selfPr")).isEqualTo("手動で書いた自己PR");
        assertThat(result.payload().get("education")).isEqualTo(List.of(Map.of("schoolName", "Manual Uni")));
        assertThat(result.payload().get("phone")).isEqualTo("09012345678");
        assertThat(result.payload().get("hobbies")).isEqualTo("読書");
        assertThat(result.report().filled()).contains("email", "phone");
        assertThat(result.report().preserved()).contains("fullName", "selfPr", "education");
        assertThat(result.report().conflicts()).contains("fullName", "selfPr", "education");
    }

    @Test
    void replaceAllOverwritesProfileFieldsButKeepsDraftOnly() {
        Map<String, Object> draft = Map.of(
                "fullName", "Manual",
                "hobbies", "サッカー",
                "motivationCompany", "御社の技術力に魅力を感じます"
        );
        Map<String, Object> profile = Map.of(
                "fullName", "FromProfile",
                "email", "a@b.c"
        );

        CvProfileSyncMerger.MergeResult result = CvProfileSyncMerger.merge(
                draft, profile, CvProfileSyncMerger.Mode.REPLACE_ALL);

        assertThat(result.payload().get("fullName")).isEqualTo("FromProfile");
        assertThat(result.payload().get("email")).isEqualTo("a@b.c");
        assertThat(result.payload().get("hobbies")).isEqualTo("サッカー");
        assertThat(result.payload().get("motivationCompany")).isEqualTo("御社の技術力に魅力を感じます");
    }

    @Test
    void emptyProfileReportsMissingWithoutWipingDraft() {
        Map<String, Object> draft = Map.of("fullName", "Keep Me", "selfPr", "PR");
        CvProfileSyncMerger.MergeResult result = CvProfileSyncMerger.merge(
                draft, Map.of(), CvProfileSyncMerger.Mode.FILL_BLANK);
        assertThat(result.payload().get("fullName")).isEqualTo("Keep Me");
        assertThat(result.payload().get("selfPr")).isEqualTo("PR");
    }

    @Test
    void normalizesDatesPhoneAndPostal() {
        Map<String, Object> raw = new LinkedHashMap<>();
        raw.put("dateOfBirth", "2002/12/2");
        raw.put("postalCode", "1640001");
        raw.put("phone", "09012345678");
        Map<String, Object> n = CvProfileSyncMerger.normalizePayload(raw);
        assertThat(n.get("dateOfBirth")).isEqualTo("2002-12-02");
        assertThat(n.get("postalCode")).isEqualTo("164-0001");
        assertThat(n.get("phone")).isEqualTo("090-1234-5678");
    }

    @Test
    void incompleteProfileFillsOnlyAvailable() {
        Map<String, Object> draft = new LinkedHashMap<>();
        draft.put("fullName", "");
        draft.put("email", "");
        Map<String, Object> profile = Map.of("fullName", "Only Name");
        CvProfileSyncMerger.MergeResult result = CvProfileSyncMerger.merge(
                draft, profile, CvProfileSyncMerger.Mode.FILL_BLANK);
        assertThat(result.payload().get("fullName")).isEqualTo("Only Name");
        assertThat(result.report().filled()).contains("fullName");
        assertThat(result.report().missingInProfile()).contains("email");
    }

    @Test
    void parseModeDefaultsToFillBlank() {
        assertThat(CvProfileSyncMerger.parseMode(null)).isEqualTo(CvProfileSyncMerger.Mode.FILL_BLANK);
        assertThat(CvProfileSyncMerger.parseMode(Map.of())).isEqualTo(CvProfileSyncMerger.Mode.FILL_BLANK);
        assertThat(CvProfileSyncMerger.parseMode(Map.of("replaceAll", true)))
                .isEqualTo(CvProfileSyncMerger.Mode.REPLACE_ALL);
        assertThat(CvProfileSyncMerger.parseMode(Map.of("mode", "OVERWRITE_SCALARS")))
                .isEqualTo(CvProfileSyncMerger.Mode.OVERWRITE_SCALARS);
    }
}
