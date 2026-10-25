package com.tronai.career.service.provider;

import java.util.List;

public interface JobSearchProvider {
    String providerId();
    boolean isAvailable();
    List<ExternalJobListing> fetchJobs();
}
