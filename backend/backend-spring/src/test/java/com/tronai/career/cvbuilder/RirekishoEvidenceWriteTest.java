package com.tronai.career.cvbuilder;

import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RirekishoEvidenceWriteTest {

    @TempDir
    Path outputDirectory;

    @Test
    void writeSampleXlsx() throws Exception {
        Path out = outputDirectory.resolve("sample_rirekisho.xlsx");
        Files.createDirectories(out.getParent());

        Map<String, Object> payload = new HashMap<>();
        payload.put("furigana", "やまだ たろう");
        payload.put("nameJa", "山田 太郎");
        payload.put("dateOfBirth", LocalDate.of(2003, 4, 1));
        payload.put("nationality", "日本");
        payload.put("addressText", "東京都渋谷区1-1");
        payload.put("email", "taro@example.com");
        payload.put("phone", "090-1111-2222");
        payload.put("education", List.of(Map.of("detail", "TRON専門学校 情報システム科 卒業")));
        payload.put("workExperience", List.of(Map.of("detail", "TRON Lab インターン")));
        payload.put("selfPr", "Spring Boot と React で学習中です。");
        payload.put("hobbies", "読書");
        payload.put("certifications", List.of(Map.of("name", "基本情報技術者")));

        byte[] bytes = new RirekishoExcelFiller().fill(payload);
        Files.write(out, bytes);
        assertThat(bytes.length).isGreaterThan(5000);
        try (Workbook wb = WorkbookFactory.create(new ByteArrayInputStream(bytes))) {
            assertThat(wb.getSheet(RirekishoExcelFiller.SHEET1)).isNotNull();
            assertThat(wb.getSheet(RirekishoExcelFiller.SHEET2)).isNotNull();
            assertThat(wb.getSheet(RirekishoExcelFiller.SHEET1).getRow(2).getCell(2).getStringCellValue()).contains("山田");
        }
    }
}
