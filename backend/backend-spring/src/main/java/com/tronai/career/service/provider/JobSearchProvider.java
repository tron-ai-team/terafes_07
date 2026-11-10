package com.tronai.career.service.provider;

import java.util.List;

public interface JobSearchProvider {
    String providerId();
    boolean isAvailable();

    /** Legacy no-arg fetch — providers should prefer {@link #search(JobSearchCriteria)}. */
    List<ExternalJobListing> fetchJobs();

    default List<ExternalJobListing> search(JobSearchCriteria criteria) {
        return fetchJobs();
    }

    /** Verified deep-link for the user to open the official search UI. */
    default String externalSearchUrl(JobSearchCriteria criteria) {
        return null;
    }

    default String lastFetchStatus() {
        return "UNKNOWN";
    }
}
