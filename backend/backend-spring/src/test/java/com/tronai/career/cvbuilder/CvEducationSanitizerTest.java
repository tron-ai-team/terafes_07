package com.tronai.career.cvbuilder;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CvEducationSanitizerTest {

    @Test
    void removesOcrTemplateNoiseAndKeepsRealSchools() {
        List<Map<String, Object>> raw = new ArrayList<>();
        raw.add(row("2013 5"));
        raw.add(row("2013 5"));
        raw.add(row("国"));
        raw.add(row("籍"));
        raw.add(row("学　歴"));
        raw.add(row("職　歴"));
        raw.add(row("現住所"));
        raw.add(row("生年月日"));
        raw.add(row("専門学校東京テクニカルカレッジ情報処理科　入学"));
        raw.add(row("専門学校東京テクニカルカレッジ情報処理科　卒業見込"));
        raw.add(row("タクシラー学校、ガンパハ 高等学校　入学 (スリランカ)"));
        raw.add(row("学投法人静岡理工科大学沼津日本語学院 卒業"));
        raw.add(row("RATHNAYAKAGE THUSHAN"));
        raw.add(row("な　し"));
        raw.add(row("WP／GM／スリ・シッダールタ・クマーラ中学校 卒業 (スリランカ)"));

        CvEducationSanitizer.SanitizeResult result = CvEducationSanitizer.sanitize(raw);
        assertThat(result.inputCount()).isEqualTo(15);
        assertThat(result.kept()).hasSize(5);
        assertThat(result.kept()).allSatisfy(e ->
                assertThat(CvEducationSanitizer.displayLabel(e)).matches("(?s).*?(学校|学院|カレッジ|中学).*"));
        assertThat(result.rejected().size()).isGreaterThan(5);
    }

    @Test
    void respectsExplicitExportSelection() {
        List<Map<String, Object>> raw = List.of(
                Map.of("id", "a", "school", "○○大学 入学"),
                Map.of("id", "b", "school", "○○大学 卒業"),
                Map.of("id", "c", "school", "△△高校 卒業")
        );
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("education", raw);
        payload.put("educationExportIds", List.of("a", "c"));

        List<Map<String, Object>> selected = CvEducationSanitizer.resolveForExport(payload);
        assertThat(selected).hasSize(2);
        assertThat(selected.stream().map(m -> String.valueOf(m.get("id"))).toList())
                .containsExactlyInAnyOrder("a", "c");
    }

    @Test
    void previewFlagsOverflowAgainstRirekishoCapacity() {
        List<Map<String, Object>> raw = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            raw.add(row("テスト大学" + i + " 卒業"));
        }
        Map<String, Object> payload = Map.of("education", raw);
        Map<String, Object> preview = CvEducationSanitizer.preview(payload, 9);
        assertThat(preview.get("overflow")).isEqualTo(true);
        assertThat(preview.get("exportCount")).isEqualTo(12);
        assertThat(preview.get("keptCount")).isEqualTo(12);
    }

    private static Map<String, Object> row(String school) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("school", school);
        m.put("detail", "");
        return m;
    }
}
