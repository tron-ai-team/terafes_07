package com.tronai.cv.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CvSuggestionsResponse {
    private List<String> generalSuggestions;
    private List<String> jobSpecificSuggestions;
    private String language;
}
