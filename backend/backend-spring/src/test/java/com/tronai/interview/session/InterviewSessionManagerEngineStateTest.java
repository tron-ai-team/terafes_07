package com.tronai.interview.session;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.interview.InterviewSessionEntity;
import com.tronai.interview.dto.InterviewConfigDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class InterviewSessionManagerEngineStateTest {

    @Test
    @DisplayName("Engine state JSON round-trips active topic, follow-ups, coverage, assessments, asked questions")
    void engineStateRoundTrip() {
        ObjectMapper objectMapper = new ObjectMapper();
        InterviewSessionManager manager = new InterviewSessionManager(null, null, objectMapper);

        InterviewConfigDto config = new InterviewConfigDto();
        config.setLanguage("japanese");
        InterviewSession session = new InterviewSession("mem-1", config, 5, "SMART", "gateway-smart");
        session.setActiveTopic("project_experience");
        session.incrementFollowUpsOnActiveTopic();
        session.incrementFollowUpsOnActiveTopic();
        session.setTopicCoverage(List.of("self_intro", "motivation"));
        session.recordAskedQuestion("自己紹介をお願いします。", "self_intro");
        session.recordAskedQuestion("プロジェクト経験を教えてください。", "project_experience");
        session.addAssessment(Map.of(
                "quality", "ADEQUATE",
                "action", "FOLLOW_UP",
                "topic", "project_experience",
                "scores", Map.of("relevance", 78, "clarity", 72)
        ));

        String json = manager.serializeEngineState(session);
        assertThat(json).isNotBlank();

        InterviewSessionEntity entity = InterviewSessionEntity.builder()
                .id("mem-1")
                .engineStateJson(json)
                .build();

        InterviewSession restored = new InterviewSession("mem-1", config, 5, "SMART", "gateway-smart");
        assertThat(manager.restoreEngineStateFromEntity(entity, restored)).isTrue();
        assertThat(restored.getActiveTopic()).isEqualTo("project_experience");
        assertThat(restored.getFollowUpsOnActiveTopic()).isEqualTo(2);
        assertThat(restored.getTopicCoverage()).contains("self_intro", "motivation");
        assertThat(restored.getAskedQuestions()).hasSize(2);
        assertThat(restored.getAssessments()).hasSize(1);
        assertThat(restored.getAssessments().get(0).get("quality")).isEqualTo("ADEQUATE");
    }
}
