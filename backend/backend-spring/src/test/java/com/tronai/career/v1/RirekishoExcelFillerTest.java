package com.tronai.career.v1;

import com.tronai.career.cvbuilder.RirekishoExcelFiller;
import org.apache.poi.ss.usermodel.*;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RirekishoExcelFillerTest {

    @Test
    void fillsMasterWithoutRemovingSheets() throws Exception {
        RirekishoExcelFiller filler = new RirekishoExcelFiller();
        byte[] bytes = filler.fill(Map.of(
                "furigana", "やまだ たろう",
                "nameJa", "山田 太郎",
                "dateOfBirth", LocalDate.of(2000, 4, 1),
                "nationality", "日本",
                "email", "taro@example.com",
                "education", List.of(Map.of(
                        "schoolName", "TRON大学",
                        "startYear", 2020,
                        "startMonth", 4,
                        "endYear", 2024,
                        "endMonth", 3,
                        "status", "卒業")),
                "workExperience", List.of(),
                "selfPr", "自己PRテスト"));
        try (Workbook wb = WorkbookFactory.create(new java.io.ByteArrayInputStream(bytes))) {
            assertThat(wb.getSheet(RirekishoExcelFiller.SHEET1)).isNotNull();
            assertThat(wb.getSheet(RirekishoExcelFiller.SHEET2)).isNotNull();
            Sheet s1 = wb.getSheet(RirekishoExcelFiller.SHEET1);
            assertThat(s1.getRow(2).getCell(2).getStringCellValue()).contains("山田");
            assertThat(s1.getRow(14).getCell(1).getStringCellValue()).isEqualTo("2020");
            assertThat(s1.getRow(14).getCell(3).getStringCellValue()).contains("入学");
            assertThat(s1.getRow(15).getCell(3).getStringCellValue()).contains("卒業");
            assertThat(s1.getRow(24).getCell(3).getStringCellValue()).contains("な");
        }
    }
}
