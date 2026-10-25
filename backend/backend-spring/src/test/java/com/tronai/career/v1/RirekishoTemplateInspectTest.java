package com.tronai.career.v1;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Documents rirekisho_master.xlsx structure for CV_EXCEL_TEMPLATE_MAPPING.md.
 */
class RirekishoTemplateInspectTest {

    @Test
    void dumpSheetStructure() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/career/templates/rirekisho_master.xlsx")) {
            assertThat(in).isNotNull();
            try (Workbook wb = WorkbookFactory.create(in)) {
                List<String> lines = new ArrayList<>();
                for (int i = 0; i < wb.getNumberOfSheets(); i++) {
                    Sheet sheet = wb.getSheetAt(i);
                    lines.add("SHEET index=" + i + " name=" + sheet.getSheetName());
                    lines.add("  merged regions: " + sheet.getNumMergedRegions());
                    for (int m = 0; m < Math.min(sheet.getNumMergedRegions(), 15); m++) {
                        CellRangeAddress r = sheet.getMergedRegion(m);
                        lines.add("    merge " + r.formatAsString());
                    }
                    int shown = 0;
                    for (Row row : sheet) {
                        if (row.getRowNum() > 55) break;
                        for (Cell cell : row) {
                            if (cell.getCellType() == CellType.STRING || cell.getCellType() == CellType.FORMULA) {
                                String v = cell.getCellType() == CellType.FORMULA
                                        ? cell.getRichStringCellValue().getString()
                                        : cell.getStringCellValue();
                                if (v != null && !v.isBlank()) {
                                    lines.add("    " + cell.getAddress().formatAsString() + " = " + v.replace('\n', ' '));
                                    shown++;
                                }
                            }
                        }
                        if (shown > 80) break;
                    }
                }
                java.nio.file.Path out = java.nio.file.Path.of(
                        System.getenv().getOrDefault("CAREER_V1_EVIDENCE",
                                "C:/Users/engrm/OneDrive/Desktop/Group7/_career_center_v1_evidence"),
                        "rirekisho_template_inspect.txt");
                java.nio.file.Files.createDirectories(out.getParent());
                java.nio.file.Files.writeString(out, String.join(System.lineSeparator(), lines));
                System.out.println(String.join("\n", lines.subList(0, Math.min(40, lines.size()))));
            }
        }
    }
}
