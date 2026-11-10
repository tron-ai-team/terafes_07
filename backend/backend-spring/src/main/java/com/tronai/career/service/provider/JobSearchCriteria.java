package com.tronai.career.service.provider;

import java.util.ArrayList;
import java.util.List;

/**
 * Query parameters passed to job source providers.
 * Missing fields mean "no filter" — never invent requirements.
 */
public class JobSearchCriteria {

    private String query;
    private String location;
    private List<String> keywords = new ArrayList<>();
    private String employmentType;
    private Boolean newGraduateOnly;
    private int maxResults = 25;
    private boolean forceRefresh;

    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public List<String> getKeywords() { return keywords; }
    public void setKeywords(List<String> keywords) {
        this.keywords = keywords != null ? keywords : new ArrayList<>();
    }
    public String getEmploymentType() { return employmentType; }
    public void setEmploymentType(String employmentType) { this.employmentType = employmentType; }
    public Boolean getNewGraduateOnly() { return newGraduateOnly; }
    public void setNewGraduateOnly(Boolean newGraduateOnly) { this.newGraduateOnly = newGraduateOnly; }
    public int getMaxResults() { return maxResults; }
    public void setMaxResults(int maxResults) { this.maxResults = maxResults; }
    public boolean isForceRefresh() { return forceRefresh; }
    public void setForceRefresh(boolean forceRefresh) { this.forceRefresh = forceRefresh; }

    public static JobSearchCriteria from(String query, String location, List<String> keywords,
                                         String employmentType, Boolean newGraduateOnly,
                                         Integer maxResults, boolean forceRefresh) {
        JobSearchCriteria c = new JobSearchCriteria();
        c.setQuery(query);
        c.setLocation(location);
        c.setKeywords(keywords);
        c.setEmploymentType(employmentType);
        c.setNewGraduateOnly(newGraduateOnly);
        if (maxResults != null && maxResults > 0) {
            c.setMaxResults(maxResults);
        }
        c.setForceRefresh(forceRefresh);
        return c;
    }
}
