package com.tronai.cv.dto;

import lombok.Data;

import java.util.List;

@Data
public class CvProfileUpdateRequest {
    private String versionLabel;
    private List<EducationItemDto> education;
    private List<String> skills;
    private List<ExperienceItemDto> workExperience;
    private List<String> languages;
    private String summaryText;
}
