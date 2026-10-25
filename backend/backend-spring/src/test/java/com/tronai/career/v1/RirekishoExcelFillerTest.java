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
                "education", List.of(Map.of("school", "TRON大学", "period", "2020-2024", "detail", "情報工学")),
                "workExperience", List.of(),
                "selfPr", "自己PRテスト"));
        try (Workbook wb = WorkbookFactory.create(new java.io.ByteArrayInputStream(bytes))) {
            assertThat(wb.getSheet(RirekishoExcelFiller.SHEET1)).isNotNull();
            assertThat(wb.getSheet(RirekishoExcelFiller.SHEET2)).isNotNull();
            Sheet s1 = wb.getSheet(RirekishoExcelFiller.SHEET1);
            assertThat(s1.getRow(2).getCell(2).getStringCellValue()).contains("山田");
        }
    }
}
