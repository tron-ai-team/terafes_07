package com.tronai.chat.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@JsonInclude(JsonInclude.Include.ALWAYS)
public class SearchInfo {

    private String mode = "auto";
    private boolean performed = false;
    private String status = "unavailable";
    private String query = null;
    private String detail = "";
    private List<SearchHit> results = new ArrayList<>();

    /** Additive V1 fields — optional for older clients. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Boolean requested;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Boolean available;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String provider;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private List<String> warnings;

    public SearchInfo() {
    }

    public SearchInfo(String mode, boolean performed, String status, String query, String detail, List<SearchHit> results) {
        this(mode, performed, status, query, detail, results, null, null, null, null);
    }

    public SearchInfo(
            String mode,
            boolean performed,
            String status,
            String query,
            String detail,
            List<SearchHit> results,
            Boolean requested,
            Boolean available,
            String provider,
            List<String> warnings) {
        this.mode = mode != null ? mode : "auto";
        this.performed = performed;
        this.status = status != null ? status : "unavailable";
        this.query = query;
        this.detail = detail != null ? detail : "";
        this.results = results != null ? results : new ArrayList<>();
        this.requested = requested;
        this.available = available;
        this.provider = provider;
        this.warnings = warnings;
    }

    public static Builder builder() {
        return new Builder();
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public boolean isPerformed() {
        return performed;
    }

    public void setPerformed(boolean performed) {
        this.performed = performed;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public String getDetail() {
        return detail;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public List<SearchHit> getResults() {
        return results;
    }

    public void setResults(List<SearchHit> results) {
        this.results = results != null ? results : new ArrayList<>();
    }

    public Boolean getRequested() {
        return requested;
    }

    public void setRequested(Boolean requested) {
        this.requested = requested;
    }

    public Boolean getAvailable() {
        return available;
    }

    public void setAvailable(Boolean available) {
        this.available = available;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }

    public static class Builder {
        private String mode = "auto";
        private boolean performed = false;
        private String status = "unavailable";
        private String query = null;
        private String detail = "";
        private List<SearchHit> results = new ArrayList<>();
        private Boolean requested;
        private Boolean available;
        private String provider;
        private List<String> warnings;

        public Builder mode(String mode) {
            this.mode = mode;
            return this;
        }

        public Builder performed(boolean performed) {
            this.performed = performed;
            return this;
        }

        public Builder status(String status) {
            this.status = status;
            return this;
        }

        public Builder query(String query) {
            this.query = query;
            return this;
        }

        public Builder detail(String detail) {
            this.detail = detail;
            return this;
        }

        public Builder results(List<SearchHit> results) {
            this.results = results != null ? results : new ArrayList<>();
            return this;
        }

        public Builder requested(Boolean requested) {
            this.requested = requested;
            return this;
        }

        public Builder available(Boolean available) {
            this.available = available;
            return this;
        }

        public Builder provider(String provider) {
            this.provider = provider;
            return this;
        }

        public Builder warnings(List<String> warnings) {
            this.warnings = warnings;
            return this;
        }

        public SearchInfo build() {
            return new SearchInfo(mode, performed, status, query, detail, results, requested, available, provider, warnings);
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SearchInfo that)) return false;
        return performed == that.performed &&
                Objects.equals(mode, that.mode) &&
                Objects.equals(status, that.status) &&
                Objects.equals(query, that.query) &&
                Objects.equals(detail, that.detail) &&
                Objects.equals(results, that.results) &&
                Objects.equals(requested, that.requested) &&
                Objects.equals(available, that.available) &&
                Objects.equals(provider, that.provider) &&
                Objects.equals(warnings, that.warnings);
    }

    @Override
    public int hashCode() {
        return Objects.hash(mode, performed, status, query, detail, results, requested, available, provider, warnings);
    }

    @Override
    public String toString() {
        return "SearchInfo{" +
                "mode='" + mode + '\'' +
                ", performed=" + performed +
                ", status='" + status + '\'' +
                ", query='" + query + '\'' +
                ", detail='" + detail + '\'' +
                ", results=" + results +
                ", provider='" + provider + '\'' +
                '}';
    }
}
