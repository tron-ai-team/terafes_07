package com.tronai.interview.dto;

/**
 * Evidence-based competency category for final interview analysis.
 * Score may be null when level is {@code not_assessed}.
 */
public class CategoryAssessmentDto {

    private String category;
    private String categoryJa;
    /** strong | adequate | weak | not_assessed */
    private String level;
    private Integer score;
    private String evidence;

    public CategoryAssessmentDto() {
    }

    public CategoryAssessmentDto(String category, String categoryJa, String level, Integer score, String evidence) {
        this.category = category;
        this.categoryJa = categoryJa;
        this.level = level;
        this.score = score;
        this.evidence = evidence;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getCategoryJa() {
        return categoryJa;
    }

    public void setCategoryJa(String categoryJa) {
        this.categoryJa = categoryJa;
    }

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public String getEvidence() {
        return evidence;
    }

    public void setEvidence(String evidence) {
        this.evidence = evidence;
    }
}
