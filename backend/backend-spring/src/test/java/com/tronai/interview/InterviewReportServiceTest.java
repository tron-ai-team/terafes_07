package com.tronai.interview;

import com.tronai.interview.dto.CategoryAssessmentDto;
import com.tronai.interview.dto.InterviewAnalysisResultDto;
import com.tronai.interview.dto.StarSuggestionDto;
import com.tronai.interview.dto.TranscriptMessageDto;
import com.tronai.interview.service.InterviewReportService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class InterviewReportServiceTest {

    private final InterviewReportService reportService = new InterviewReportService();

    @Test
    @DisplayName("Report HTML includes Japanese headings and transcript labels")
    void htmlContainsJapaneseText() {
        InterviewAnalysisResultDto analysis = new InterviewAnalysisResultDto();
        analysis.setInterviewId("ja-report-1");
        analysis.setCompanyName("LINEヤフー株式会社");
        analysis.setJobPosition("バックエンドエンジニア");
        analysis.setOverallScore(82);
        analysis.setCommunicationScore(80);
        analysis.setJapaneseScore(85);
        analysis.setTechnicalScore(84);
        analysis.setConfidenceScore(78);
        analysis.setAiOverallFeedback("論理的な説明ができています。");
        analysis.setStrongPoints(List.of("技術的な背景の説明が明確"));
        analysis.setWeakPoints(List.of("数値根拠を増やす"));
        analysis.setStarSuggestion(new StarSuggestionDto("状況", "課題", "行動", "成果"));
        analysis.setCategoryAssessments(List.of(
                new CategoryAssessmentDto("Answer Relevance", "回答の関連性", "adequate", 78, "対話ログの自己紹介回答")
        ));
        analysis.setTranscript(List.of(
                new TranscriptMessageDto("t1", "ai", "自己紹介をお願いします。", "10:00", false),
                new TranscriptMessageDto("t2", "user", "Java開発経験があります。", "10:01", false)
        ));

        String html = new String(reportService.buildReportHtml(analysis), StandardCharsets.UTF_8);
        assertThat(html).contains("面接パフォーマンスレポート");
        assertThat(html).contains("評価カテゴリ");
        assertThat(html).contains("候補者 Candidate");
        assertThat(html).contains("自己紹介をお願いします。");
    }
}
