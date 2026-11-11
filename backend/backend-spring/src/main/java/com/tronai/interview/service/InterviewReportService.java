package com.tronai.interview.service;

import com.tronai.interview.dto.CategoryAssessmentDto;
import com.tronai.interview.dto.InterviewAnalysisResultDto;
import com.tronai.interview.dto.StarSuggestionDto;
import com.tronai.interview.dto.TranscriptMessageDto;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Builds print-ready HTML for interview performance reports (Japanese + English Unicode).
 */
@Service
public class InterviewReportService {

    public byte[] buildReportHtml(InterviewAnalysisResultDto analysis) {
        return buildReportHtmlDocument(analysis).getBytes(StandardCharsets.UTF_8);
    }

    public String buildReportHtmlDocument(InterviewAnalysisResultDto analysis) {
        if (analysis == null) {
            analysis = new InterviewAnalysisResultDto();
        }

        String company = esc(analysis.getCompanyName() != null ? analysis.getCompanyName() : "—");
        String role = esc(analysis.getJobPosition() != null ? analysis.getJobPosition() : "—");
        String sessionId = esc(analysis.getInterviewId() != null ? analysis.getInterviewId() : "—");
        String completion = esc(analysis.getCompletionDate() != null ? analysis.getCompletionDate() : "—");

        StringBuilder transcript = new StringBuilder();
        List<TranscriptMessageDto> messages = analysis.getTranscript();
        if (messages != null) {
            for (TranscriptMessageDto m : messages) {
                String sender = "user".equalsIgnoreCase(m.getSender()) ? "候補者 Candidate" : "面接官 Interviewer";
                String css = "user".equalsIgnoreCase(m.getSender()) ? "candidate" : "interviewer";
                transcript.append("""
                        <div class="turn %s">
                          <div class="turn-label">%s · %s</div>
                          <p>%s</p>
                        </div>
                        """.formatted(css, esc(m.getTimestamp()), sender, esc(m.getText())));
            }
        }

        StringBuilder categories = new StringBuilder();
        List<CategoryAssessmentDto> cats = analysis.getCategoryAssessments();
        if (cats != null && !cats.isEmpty()) {
            for (CategoryAssessmentDto c : cats) {
                String scoreCell = c.getScore() != null ? c.getScore() + "/100" : "—";
                categories.append("""
                        <tr>
                          <td>%s<br/><span class="sub">%s</span></td>
                          <td>%s</td>
                          <td>%s</td>
                          <td class="evidence">%s</td>
                        </tr>
                        """.formatted(
                        esc(c.getCategory()),
                        esc(c.getCategoryJa()),
                        esc(c.getLevel()),
                        scoreCell,
                        esc(c.getEvidence())));
            }
        } else {
            categories.append("<tr><td colspan=\"4\">評価カテゴリは対話ログから十分な根拠が得られませんでした / Insufficient evidence for category breakdown.</td></tr>");
        }

        String strengths = bulletList(analysis.getStrongPoints());
        String weaknesses = bulletList(analysis.getWeakPoints());
        StarSuggestionDto star = analysis.getStarSuggestion();

        return """
                <!DOCTYPE html>
                <html lang="ja">
                <head>
                  <meta charset="UTF-8"/>
                  <title>TRON AI 面接レポート / Interview Report</title>
                  <style>
                    @page { size: A4; margin: 18mm 16mm; }
                    body { font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Segoe UI", sans-serif; color: #0f172a; font-size: 11pt; line-height: 1.55; }
                    h1 { font-size: 20pt; margin: 0 0 4px; color: #0369a1; }
                    h2 { font-size: 13pt; margin: 22px 0 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
                    .meta { color: #64748b; font-size: 10pt; margin-bottom: 18px; }
                    /* Table layout — LibreOffice HTML→PDF (production Gotenberg) does not honor CSS grid */
                    .scores { width: 100%%; border-collapse: collapse; margin: 12px 0; }
                    .scores td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 20%%; }
                    .score-box .val, .scores .val { font-size: 16pt; font-weight: 800; color: #0284c7; }
                    .score-box .lbl, .scores .lbl { font-size: 8pt; color: #475569; }
                    table { width: 100%%; border-collapse: collapse; font-size: 9.5pt; }
                    th, td { border: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; }
                    th { background: #f1f5f9; text-align: left; }
                    .sub { color: #64748b; font-size: 8.5pt; }
                    .evidence { font-size: 9pt; }
                    .feedback { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 12px; white-space: pre-wrap; }
                    ul { margin: 6px 0; padding-left: 18px; }
                    .turn { margin: 8px 0; padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0; }
                    .turn.candidate { background: #eff6ff; }
                    .turn.interviewer { background: #f8fafc; }
                    .turn-label { font-size: 8.5pt; font-weight: 700; color: #64748b; margin-bottom: 4px; }
                    .footer { margin-top: 24px; font-size: 8.5pt; color: #94a3b8; }
                  </style>
                </head>
                <body>
                  <h1>面接パフォーマンスレポート</h1>
                  <div class="meta">Interview Performance Report · Session %s · %s</div>
                  <p><strong>%s</strong> — %s</p>

                  <table class="scores">
                    <tr>
                      <td><div class="val">%d</div><div class="lbl">総合 / Overall</div></td>
                      <td><div class="val">%d</div><div class="lbl">伝達力 / Communication</div></td>
                      <td><div class="val">%d</div><div class="lbl">日本語 / Japanese</div></td>
                      <td><div class="val">%d</div><div class="lbl">技術 / Technical</div></td>
                      <td><div class="val">%d</div><div class="lbl">自信 / Confidence</div></td>
                    </tr>
                  </table>

                  <h2>評価カテゴリ（根拠ベース） / Evidence-Based Categories</h2>
                  <table>
                    <thead>
                      <tr><th>Category</th><th>Level</th><th>Score</th><th>Evidence / 根拠</th></tr>
                    </thead>
                    <tbody>%s</tbody>
                  </table>

                  <h2>AI 総評 / Overall Feedback</h2>
                  <div class="feedback">%s</div>

                  <h2>強み / Strong Points</h2>
                  %s
                  <h2>改善点 / Areas to Improve</h2>
                  %s

                  <h2>STAR 提案 / STAR Suggestion</h2>
                  <ul>
                    <li><strong>S:</strong> %s</li>
                    <li><strong>T:</strong> %s</li>
                    <li><strong>A:</strong> %s</li>
                    <li><strong>R:</strong> %s</li>
                  </ul>

                  <h2>対話ログ / Transcript</h2>
                  %s

                  <div class="footer">
                    本レポートは TRON AI 模擬面接の練習評価です。実際の採用結果を保証しません。
                    This report is for interview skill practice only and does not guarantee hiring outcomes.
                  </div>
                </body>
                </html>
                """.formatted(
                sessionId,
                completion,
                company,
                role,
                analysis.getOverallScore(),
                analysis.getCommunicationScore(),
                analysis.getJapaneseScore(),
                analysis.getTechnicalScore(),
                analysis.getConfidenceScore(),
                categories,
                esc(analysis.getAiOverallFeedback()),
                strengths,
                weaknesses,
                esc(star != null ? star.getSituation() : ""),
                esc(star != null ? star.getTask() : ""),
                esc(star != null ? star.getAction() : ""),
                esc(star != null ? star.getResult() : ""),
                transcript);
    }

    private static String bulletList(List<String> items) {
        if (items == null || items.isEmpty()) {
            return "<p>—</p>";
        }
        StringBuilder sb = new StringBuilder("<ul>");
        for (String item : items) {
            sb.append("<li>").append(esc(item)).append("</li>");
        }
        sb.append("</ul>");
        return sb.toString();
    }

    private static String esc(String raw) {
        if (raw == null) {
            return "";
        }
        return HtmlUtils.htmlEscape(raw);
    }
}
