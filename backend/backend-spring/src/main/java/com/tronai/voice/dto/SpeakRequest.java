package com.tronai.voice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class SpeakRequest {

    @JsonProperty("text")
    private String text;

    /** Optional BCP-47 / interview language hint (e.g. ja, en, japanese, english). */
    @JsonProperty("language")
    private String language;

    public SpeakRequest() {
    }

    public SpeakRequest(String text) {
        this.text = text;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }
}
