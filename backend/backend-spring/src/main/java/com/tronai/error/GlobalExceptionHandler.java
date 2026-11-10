package com.tronai.error;

import com.tronai.desktopagent.DesktopAgentException;
import com.tronai.ai.AiProviderException;
import com.tronai.ai.CloudAiException;
import com.tronai.ai.FallbackAiProvider;
import com.tronai.ai.AiProviderTimeoutException;
import com.tronai.ai.AiProviderUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.stream.Collectors;

/**
 * Centralized exception handler preserving the FastAPI-compatible {"detail": "..."} error format.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ChatValidationException.class)
    public ResponseEntity<ErrorResponse> handleChatValidation(ChatValidationException ex) {
        log.warn("Validation error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(com.tronai.ai.model.ModelNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleModelNotFound(com.tronai.ai.model.ModelNotFoundException ex) {
        log.warn("Model not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(com.tronai.ai.model.ModelDisabledException.class)
    public ResponseEntity<ErrorResponse> handleModelDisabled(com.tronai.ai.model.ModelDisabledException ex) {
        log.warn("Model disabled: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(com.tronai.cv.CvException.class)
    public ResponseEntity<ErrorResponse> handleCvException(com.tronai.cv.CvException ex) {
        log.warn("CV error {}: {}", ex.getStatus(), ex.getMessage());
        return ResponseEntity.status(ex.getStatus())
                .body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(com.tronai.interview.InterviewException.class)
    public ResponseEntity<ErrorResponse> handleInterviewException(com.tronai.interview.InterviewException ex) {
        log.warn("Interview error {}: {}", ex.getStatus(), ex.getMessage());
        return ResponseEntity.status(ex.getStatus())
                .body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(com.tronai.voice.VoiceException.class)
    public ResponseEntity<ErrorResponse> handleVoiceException(com.tronai.voice.VoiceException ex) {
        log.warn("Voice error {}: {}", ex.getStatus(), ex.getMessage());
        return ResponseEntity.status(ex.getStatus())
                .body(new ErrorResponse(ex.getMessage()));
    }


    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSizeExceeded(org.springframework.web.multipart.MaxUploadSizeExceededException ex) {
        log.warn("Upload size exceeded: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(new ErrorResponse("PDF exceeds the 5MB limit"));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));
        if (detail.isBlank()) {
            detail = "Invalid request payload";
        }
        log.warn("Method argument invalid: {}", detail);
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(new ErrorResponse(detail));
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleHttpMessageNotReadable(org.springframework.http.converter.HttpMessageNotReadableException ex) {
        String detail = extractReadableDetail(ex);
        log.warn("Malformed HTTP message: {}", detail);
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(new ErrorResponse(detail));
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageConversionException.class)
    public ResponseEntity<ErrorResponse> handleHttpMessageConversion(org.springframework.http.converter.HttpMessageConversionException ex) {
        String detail = extractReadableDetailFromThrowable(ex);
        log.warn("HTTP message conversion failed: {}", detail);
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(new ErrorResponse(detail));
    }

    private static String extractReadableDetail(org.springframework.http.converter.HttpMessageNotReadableException ex) {
        return extractReadableDetailFromThrowable(ex);
    }

    private static String extractReadableDetailFromThrowable(Throwable ex) {
        StringBuilder chain = new StringBuilder();
        Throwable cursor = ex;
        while (cursor != null) {
            if (cursor.getMessage() != null) {
                chain.append(' ').append(cursor.getMessage());
            }
            cursor = cursor.getCause();
        }
        String message = chain.toString();
        if (message.isBlank()) {
            return "Invalid request payload";
        }
        String lower = message.toLowerCase();
        // Prefer explicit field guidance from custom deserializers / date failures.
        if (message.contains("Please enter a valid date of birth")) {
            int idx = message.indexOf("Please enter a valid date of birth");
            String sliced = message.substring(idx);
            int end = sliced.indexOf('\n');
            return end > 0 ? sliced.substring(0, end).trim() : sliced.trim();
        }
        if (lower.contains("dateofbirth") || lower.contains("localdate") || lower.contains("date of birth")
                || lower.contains("yyyy-mm-dd")) {
            return "Please enter a valid date of birth. Expected format: YYYY-MM-DD";
        }
        if (lower.contains("skills must be") || lower.contains("languages must be")) {
            return "Skills/languages must be a JSON array of strings or objects.";
        }
        // Truly malformed JSON stays generic for existing API contract compatibility.
        return "Invalid request payload";
    }

    @ExceptionHandler(AiProviderTimeoutException.class)
    public ResponseEntity<ErrorResponse> handleAiProviderTimeout(AiProviderTimeoutException ex) {
        log.error("AI provider timeout: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT)
                .body(new ErrorResponse("Ollama timed out"));
    }

    @ExceptionHandler(CloudAiException.class)
    public ResponseEntity<ErrorResponse> handleCloudAi(CloudAiException ex) {
        log.error("Cloud AI provider failed");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(AiProviderUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleAiProviderUnavailable(AiProviderUnavailableException ex) {
        if (FallbackAiProvider.LOCAL_UNAVAILABLE_DETAIL.equals(ex.getMessage())) {
            log.error("Local AI unavailable and cloud fallback is disabled");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(new ErrorResponse(FallbackAiProvider.LOCAL_UNAVAILABLE_DETAIL));
        }
        log.error("AI provider unavailable: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ErrorResponse("Ollama is unavailable"));
    }

    @ExceptionHandler(AiProviderException.class)
    public ResponseEntity<ErrorResponse> handleAiProviderGeneric(AiProviderException ex) {
        log.error("AI provider error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ErrorResponse("Ollama request failed"));
    }

    @ExceptionHandler(com.tronai.ai.gateway.AiQuotaExceededException.class)
    public ResponseEntity<ErrorResponse> handleAiQuotaExceeded(com.tronai.ai.gateway.AiQuotaExceededException ex) {
        log.warn("AI quota exceeded: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(com.tronai.ai.gateway.provider.GatewayProviderException.class)
    public ResponseEntity<ErrorResponse> handleGatewayProvider(com.tronai.ai.gateway.provider.GatewayProviderException ex) {
        log.error("AI gateway provider error [{}]: {}", ex.getCategory(), ex.getMessage());
        HttpStatus status = HttpStatus.resolve(ex.getHttpStatus());
        if (status == null) {
            status = HttpStatus.BAD_GATEWAY;
        }
        return ResponseEntity.status(status)
                .body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(IllegalStateException ex) {
        String message = ex.getMessage() != null ? ex.getMessage() : "Invalid state";
        if (message.toLowerCase().contains("authentication")) {
            log.warn("AI gateway auth required: {}", message);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse(message));
        }
        log.warn("Illegal state: {}", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(message));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Bad request argument: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handleResponseStatus(ResponseStatusException ex) {
        String reason = ex.getReason() != null ? ex.getReason() : ex.getMessage();
        if (ex instanceof DesktopAgentException agent && agent.getErrorCode() != null) {
            return ResponseEntity.status(ex.getStatusCode())
                    .body(new ErrorResponse(reason, agent.getErrorCode()));
        }
        return ResponseEntity.status(ex.getStatusCode())
                .body(new ErrorResponse(reason));
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        log.debug("Resource not found: {}", ex.getResourcePath());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("Resource not found"));
    }

    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMediaTypeNotSupported(
            org.springframework.web.HttpMediaTypeNotSupportedException ex) {
        log.warn("Unsupported media type: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .body(new ErrorResponse("Unsupported Content-Type"));
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(
            org.springframework.web.HttpRequestMethodNotSupportedException ex) {
        log.warn("Method not supported: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(new ErrorResponse("HTTP method not supported"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        log.error("Unhandled exception: ", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Internal server error"));
    }
}

