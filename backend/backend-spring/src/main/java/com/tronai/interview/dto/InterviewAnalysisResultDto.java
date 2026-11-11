package com.tronai.interview.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Result structure returned by GET /api/v1/interviews/{interviewId}/analysis.
 */
public class InterviewAnalysisResultDto {

    private String interviewId;
    private String companyName;
    private String jobPosition;
    private String interviewType;
    private String difficulty;
    private int overallScore;
    private int communicationScore;
    private int japaneseScore;
    private int technicalScore;
    private int confidenceScore;
    private List<RadarDataDto> radarData;
    private List<String> strongPoints;
    private List<String> weakPoints;
    private String aiOverallFeedback;
    private StarSuggestionDto starSuggestion;
    private int durationMinutes;
    private String completionDate;
    private List<TranscriptMessageDto> transcript;
    private List<CategoryAssessmentDto> categoryAssessments;

    public InterviewAnalysisResultDto() {
        this.radarData = new ArrayList<>();
        this.strongPoints = new ArrayList<>();
        this.weakPoints = new ArrayList<>();
        this.transcript = new ArrayList<>();
        this.starSuggestion = new StarSuggestionDto();
        this.categoryAssessments = new ArrayList<>();
    }

    public String getInterviewId() {
        return interviewId;
    }

    public void setInterviewId(String interviewId) {
        this.interviewId = interviewId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getJobPosition() {
        return jobPosition;
    }

    public void setJobPosition(String jobPosition) {
        this.jobPosition = jobPosition;
    }

    public String getInterviewType() {
        return interviewType;
    }

    public void setInterviewType(String interviewType) {
        this.interviewType = interviewType;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public int getOverallScore() {
        return overallScore;
    }

    public void setOverallScore(int overallScore) {
        this.overallScore = overallScore;
    }

    public int getCommunicationScore() {
        return communicationScore;
    }

    public void setCommunicationScore(int communicationScore) {
        this.communicationScore = communicationScore;
    }

    public int getJapaneseScore() {
        return japaneseScore;
    }

    public void setJapaneseScore(int japaneseScore) {
        this.japaneseScore = japaneseScore;
    }

    public int getTechnicalScore() {
        return technicalScore;
    }

    public void setTechnicalScore(int technicalScore) {
        this.technicalScore = technicalScore;
    }

    public int getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(int confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public List<RadarDataDto> getRadarData() {
        return radarData;
    }

    public void setRadarData(List<RadarDataDto> radarData) {
        this.radarData = radarData;
    }

    public List<String> getStrongPoints() {
        return strongPoints;
    }

    public void setStrongPoints(List<String> strongPoints) {
        this.strongPoints = strongPoints;
    }

    public List<String> getWeakPoints() {
        return weakPoints;
    }

    public void setWeakPoints(List<String> weakPoints) {
        this.weakPoints = weakPoints;
    }

    public String getAiOverallFeedback() {
        return aiOverallFeedback;
    }

    public void setAiOverallFeedback(String aiOverallFeedback) {
        this.aiOverallFeedback = aiOverallFeedback;
    }

    public StarSuggestionDto getStarSuggestion() {
        return starSuggestion;
    }

    public void setStarSuggestion(StarSuggestionDto starSuggestion) {
        this.starSuggestion = starSuggestion;
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(int durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public String getCompletionDate() {
        return completionDate;
    }

    public void setCompletionDate(String completionDate) {
        this.completionDate = completionDate;
    }

    public List<TranscriptMessageDto> getTranscript() {
        return transcript;
    }

    public void setTranscript(List<TranscriptMessageDto> transcript) {
        this.transcript = transcript;
    }

    public List<CategoryAssessmentDto> getCategoryAssessments() {
        return categoryAssessments;
    }

    public void setCategoryAssessments(List<CategoryAssessmentDto> categoryAssessments) {
        this.categoryAssessments = categoryAssessments;
    }
}
