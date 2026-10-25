package com.tronai.interview;

import com.tronai.auth.SecurityUtils;
import com.tronai.interview.dto.*;
import com.tronai.interview.service.InterviewService;
import com.tronai.stt.SpeechToTextProvider;
import com.tronai.stt.SttTranscriptionResult;
import com.tronai.language.ExperienceLanguage;
import com.tronai.tts.AudioStoreService;
import com.tronai.tts.SpeechLanguageCapability;
import com.tronai.tts.SpeechSynthesisRouter;
import com.tronai.voice.VoiceException;
import com.tronai.voice.VoiceService;
import com.tronai.voice.dto.V1VoiceAnswerResponse;
import com.tronai.voice.dto.VoiceLatencyDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.regex.Pattern;

/**
 * REST controller for interview lifecycle operations, history, and voice-assisted interview.
 */
@RestController
@RequestMapping("/api/v1/interviews")
@Tag(name = "Interview", description = "Interview simulation, progression, history, and analysis endpoints")
public class InterviewController {

    private static final Pattern JAPANESE_PATTERN = Pattern.compile("[\\u3040-\\u30FF\\u4E00-\\u9FFF]");

    private final InterviewService interviewService;
    private final SpeechToTextProvider speechToTextProvider;
    private final SpeechSynthesisRouter speechSynthesisRouter;
    private final AudioStoreService audioStoreService;

    @Autowired
    public InterviewController(InterviewService interviewService,
                               SpeechToTextProvider speechToTextProvider,
                               SpeechSynthesisRouter speechSynthesisRouter,
                               AudioStoreService audioStoreService) {
        this.interviewService = interviewService;
        this.speechToTextProvider = speechToTextProvider;
        this.speechSynthesisRouter = speechSynthesisRouter;
        this.audioStoreService = audioStoreService;
    }

    @PostMapping("/start")
    @Operation(summary = "Start interview", description = "Initializes an interview session and returns the opening question")
    public ResponseEntity<InterviewStartResponse> startInterview(@RequestBody(required = false) InterviewConfigDto config) {
        InterviewStartResponse response = interviewService.startInterview(config);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{interviewId}/answers")
    @Operation(summary = "Submit interview answer", description = "Submits a candidate answer and advances the interview question")
    public ResponseEntity<InterviewAnswerResponse> submitAnswer(
            @PathVariable("interviewId") String interviewId,
            @RequestBody InterviewAnswerRequest request) {
        InterviewAnswerResponse response = interviewService.submitAnswer(
                interviewId,
                request != null ? request.getQuestionIndex() : null,
                request != null ? request.getAnswerText() : null
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/{interviewId}/voice-answer", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Submit interview voice answer", description = "Transcribes voice answer, advances interview using shared progression engine, and synthesizes next question")
    public ResponseEntity<V1VoiceAnswerResponse> submitVoiceAnswer(
            @PathVariable("interviewId") String interviewId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "question_index", required = false) Integer questionIndex) {

        long totalStarted = System.currentTimeMillis();

        if (file == null || file.isEmpty()) {
            throw new VoiceException(HttpStatus.BAD_REQUEST, "The audio file is empty");
        }

        byte[] audioBytes;
        try {
            audioBytes = file.getBytes();
        } catch (IOException ex) {
            throw new VoiceException(HttpStatus.BAD_REQUEST, "Failed to read audio file", ex);
        }

        // 1. Transcribe audio via STT Provider using the session's locked AI Profile
        long sttStarted = System.currentTimeMillis();
        com.tronai.interview.session.InterviewSession session = interviewService.getSession(interviewId);
        com.tronai.ai.profile.AiProfile profile = (session != null)
                ? com.tronai.ai.profile.AiProfile.fromString(session.getAiProfile())
                : com.tronai.ai.profile.AiProfile.FAST;
        String sessionLanguage = ExperienceLanguage.parseOrDefault(
                session != null && session.getConfig() != null ? session.getConfig().getLanguage() : null,
                ExperienceLanguage.JA).code();
        SttTranscriptionResult sttResult = speechToTextProvider.transcribe(
                file.getOriginalFilename(),
                file.getContentType(),
                audioBytes,
                sessionLanguage,
                profile
        );
        int sttMs = (int) (System.currentTimeMillis() - sttStarted);

        String transcript = sttResult.getText().trim();
        if (transcript.isEmpty()) {
            String empty = ExperienceLanguage.JA.code().equals(sessionLanguage)
                    ? "No Japanese speech was recognized"
                    : "No speech was recognized";
            throw new VoiceException(HttpStatus.UNPROCESSABLE_ENTITY, empty);
        }

        // 2. Submit to shared authoritative InterviewService progression engine
        long llmStarted = System.currentTimeMillis();
        InterviewAnswerResponse answerResponse = interviewService.submitAnswer(
                interviewId,
                questionIndex,
                transcript
        );
        int llmMs = (int) (System.currentTimeMillis() - llmStarted);

        // 3. Synthesize speech if interview continues
        String audioUrl = "";
        int ttsMs = 0;
        String nextQuestionText = (answerResponse.getAiFollowUpMessage() != null)
                ? answerResponse.getAiFollowUpMessage().getText()
                : "";

        if (!answerResponse.isFinished() && !nextQuestionText.isBlank()) {
            String spoken = VoiceService.speakable(nextQuestionText);
            SpeechLanguageCapability speech = speechSynthesisRouter.capability(sessionLanguage);
            boolean japaneseText = JAPANESE_PATTERN.matcher(spoken).find();
            if (speech.speechSynthesis() && (!ExperienceLanguage.JA.code().equals(sessionLanguage) || japaneseText)) {
                long ttsStarted = System.currentTimeMillis();
                byte[] wavBytes = speechSynthesisRouter.synthesizeRequired(spoken, sessionLanguage);
                ttsMs = (int) (System.currentTimeMillis() - ttsStarted);
                String clipId = audioStoreService.storeClip(wavBytes);
                audioUrl = "/api/v1/voice/audio/" + clipId;
            }
        }

        int totalMs = (int) (System.currentTimeMillis() - totalStarted);
        VoiceLatencyDto latency = new VoiceLatencyDto(sttMs, llmMs, ttsMs, totalMs);

        V1VoiceAnswerResponse response = new V1VoiceAnswerResponse();
        response.setInterviewId(interviewId);
        response.setTranscript(transcript);
        response.setNextQuestionText(nextQuestionText);
        response.setNextQuestionIndex(answerResponse.getNextQuestionIndex());
        response.setFinished(answerResponse.isFinished());
        response.setAudioUrl(audioUrl);
        response.setAudioContentType("audio/wav");
        response.setLatencyMs(latency);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{interviewId}/analysis")
    @Operation(summary = "Get interview analysis", description = "Returns performance evaluation scores and feedback for the session")
    public ResponseEntity<InterviewAnalysisResultDto> getAnalysis(@PathVariable("interviewId") String interviewId) {
        InterviewAnalysisResultDto response = interviewService.getAnalysis(interviewId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "List user interviews", description = "Retrieves all interview sessions belonging to the authenticated user")
    public ResponseEntity<List<InterviewSummaryDto>> listInterviews() {
        Long userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(interviewService.listUserInterviews(userId));
    }

    @GetMapping("/{interviewId}")
    @Operation(summary = "Get interview session detail", description = "Retrieves interview configuration and full transcript")
    public ResponseEntity<InterviewDetailDto> getInterviewDetail(@PathVariable("interviewId") String interviewId) {
        Long userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(interviewService.getUserInterviewDetail(userId, interviewId));
    }

    @DeleteMapping("/{interviewId}")
    @Operation(summary = "Delete interview history", description = "Deletes an interview session owned by the authenticated user")
    public ResponseEntity<java.util.Map<String, String>> deleteInterview(@PathVariable("interviewId") String interviewId) {
        Long userId = SecurityUtils.getRequiredUserId();
        interviewService.deleteUserInterview(userId, interviewId);
        return ResponseEntity.ok(java.util.Map.of("detail", "Interview session deleted successfully"));
    }

    @PostMapping("/{interviewId}/repeat")
    @Operation(summary = "Repeat interview scenario", description = "Starts a new interview using the same CV/job/config as a previous session")
    public ResponseEntity<InterviewStartResponse> repeatInterview(@PathVariable("interviewId") String interviewId) {
        Long userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(interviewService.repeatInterview(userId, interviewId));
    }
}
