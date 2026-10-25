package com.tronai.career.config;

import com.tronai.career.service.provider.CareerMapJobProvider;
import com.tronai.career.service.provider.JobSearchProvider;
import com.tronai.career.service.provider.MynaviJobProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class CareerJobProviderConfiguration {

    @Bean(name = "productJobSearchProviders")
    public List<JobSearchProvider> productJobSearchProviders(MynaviJobProvider mynavi,
                                                             CareerMapJobProvider careerMap) {
        return List.of(mynavi, careerMap);
    }
}
