package com.tronai.voice;

import com.tronai.tts.AudioStoreService;
import com.tronai.voice.dto.SpeakRequest;
import com.tronai.voice.dto.V1VoiceTurnResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Controller for Voice interaction, speech synthesis, and audio clip retrieval.
 * Supports universal AI performance profiles (FAST / QUALITY).
 */
@RestController
@Tag(name = "Voice", description = "Voice turn, speech synthesis, and audio playback endpoints")
public class VoiceController {

    private final VoiceService voiceService;
    private final AudioStoreService audioStoreService;

    public VoiceController(VoiceService voiceService, AudioStoreService audioStoreService) {
        this.voiceService = voiceService;
        this.audioStoreService = audioStoreService;
    }

    @PostMapping(value = "/api/v1/voice/turn", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Process voice turn", description = "Transcribes voice input, generates a reply, and synthesizes audio for the selected language with AI profile locking")
    public ResponseEntity<V1VoiceTurnResponse> voiceTurn(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "sessionId", required = false) String sessionId,
            @RequestParam(value = "session_id", required = false) String sessionIdSnake,
            @RequestParam(value = "voiceSessionId", required = false) String voiceSessionId,
            @RequestParam(value = "language", required = false) String language,
            @RequestParam(value = "aiProfile", required = false) String aiProfile,
            @RequestParam(value = "ai_profile", required = false) String aiProfileSnake) {

        if (file == null || file.isEmpty()) {
            throw new VoiceException(HttpStatus.BAD_REQUEST, "The audio file is empty");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException ex) {
            throw new VoiceException(HttpStatus.BAD_REQUEST, "Failed to read audio file", ex);
        }

        String filename = file.getOriginalFilename();
        String contentType = file.getContentType();
        String profile = (aiProfile != null && !aiProfile.isBlank()) ? aiProfile : aiProfileSnake;
        String resolvedSessionId = (sessionId != null && !sessionId.isBlank())
                ? sessionId
                : ((sessionIdSnake != null && !sessionIdSnake.isBlank()) ? sessionIdSnake : voiceSessionId);

        V1VoiceTurnResponse response = voiceService.handleVoiceTurn(bytes, filename, contentType, resolvedSessionId, language, profile);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/v1/voice/audio/{clipId}")
    @Operation(summary = "Retrieve audio clip", description = "Streams synthesized WAV audio clip by ID")
    public ResponseEntity<byte[]> getVoiceAudio(@PathVariable("clipId") String clipId) {
        byte[] data = audioStoreService.loadClip(clipId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("audio/wav"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=reply.wav");
        headers.set(HttpHeaders.CACHE_CONTROL, "no-store");

        return new ResponseEntity<>(data, headers, HttpStatus.OK);
    }

    @PostMapping("/demo/voice/speak")
    @Operation(summary = "Synthesize speech", description = "Direct text-to-speech synthesis using the configured voice for the detected language")
    public ResponseEntity<byte[]> demoSpeak(@RequestBody(required = false) SpeakRequest request) {
        String text = (request != null && request.getText() != null) ? request.getText() : "";
        if (text.trim().isEmpty()) {
            throw new VoiceException(HttpStatus.BAD_REQUEST, "Text to synthesize cannot be empty");
        }

        byte[] audioData = voiceService.speak(text);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("audio/wav"));
        headers.set(HttpHeaders.CACHE_CONTROL, "no-store");

        return new ResponseEntity<>(audioData, headers, HttpStatus.OK);
    }
}
