package com.tronai.interview.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Configuration supplied by frontend when starting an interview.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class InterviewConfigDto {

    private String companyName;
    private String companyNameJa;
    private String jobPosition;
    private String jobPositionJa;
    private String jobDescription;
    private String industry;
    private String language; // "japanese" | "english"
    private String type; // "general" | "technical" | "hr" | "behavioral"
    private String difficulty; // "beginner" | "intermediate" | "advanced"
    private String mode; // "manual" | "auto"
    private Integer questionCount;
    private String cvFileName;
    private String cvFileData;
    private String aiProfile = "FAST";
    /** Optional Career Center CV document id owned by the authenticated user. */
    private Long cvDocumentId;
    /** Optional Career Center job id owned by the authenticated user. */
    private String jobId;
    /** Optional company analysis from Career Center company interview agent. */
    private String companyAnalysisId;

    public InterviewConfigDto() {
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getCompanyNameJa() {
        return companyNameJa;
    }

    public void setCompanyNameJa(String companyNameJa) {
        this.companyNameJa = companyNameJa;
    }

    public String getJobPosition() {
        return jobPosition;
    }

    public void setJobPosition(String jobPosition) {
        this.jobPosition = jobPosition;
    }

    public String getJobPositionJa() {
        return jobPositionJa;
    }

    public void setJobPositionJa(String jobPositionJa) {
        this.jobPositionJa = jobPositionJa;
    }

    public String getJobDescription() {
        return jobDescription;
    }

    public void setJobDescription(String jobDescription) {
        this.jobDescription = jobDescription;
    }

    public String getIndustry() {
        return industry;
    }

    public void setIndustry(String industry) {
        this.industry = industry;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public Integer getQuestionCount() {
        return questionCount;
    }

    public void setQuestionCount(Integer questionCount) {
        this.questionCount = questionCount;
    }

    public String getCvFileName() {
        return cvFileName;
    }

    public void setCvFileName(String cvFileName) {
        this.cvFileName = cvFileName;
    }

    public String getCvFileData() {
        return cvFileData;
    }

    public void setCvFileData(String cvFileData) {
        this.cvFileData = cvFileData;
    }

    public String getAiProfile() {
        return aiProfile != null && !aiProfile.isBlank() ? aiProfile : "FAST";
    }

    public void setAiProfile(String aiProfile) {
        this.aiProfile = aiProfile;
    }

    public Long getCvDocumentId() {
        return cvDocumentId;
    }

    public void setCvDocumentId(Long cvDocumentId) {
        this.cvDocumentId = cvDocumentId;
    }

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public String getCompanyAnalysisId() {
        return companyAnalysisId;
    }

    public void setCompanyAnalysisId(String companyAnalysisId) {
        this.companyAnalysisId = companyAnalysisId;
    }
}
