package com.tronai.career.service;

import com.tronai.career.dto.CareerDtos;
import com.tronai.career.entity.CareerSearchRunEntity;
import com.tronai.career.entity.JobApplicationEntity;
import com.tronai.career.i18n.CareerLanguageHelper;
import com.tronai.career.repo.*;
import com.tronai.cv.CvDocumentEntity;
import com.tronai.cv.CvDocumentRepository;
import com.tronai.interview.InterviewSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class CareerDashboardService {

    private final CvDocumentRepository cvDocumentRepository;
    private final CareerJobSaveRepository careerJobSaveRepository;
    private final CareerMatchRepository careerMatchRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final InterviewSessionRepository interviewSessionRepository;
    private final CareerSearchRunRepository careerSearchRunRepository;
    private final CareerLanguageHelper languageHelper;

    public CareerDashboardService(CvDocumentRepository cvDocumentRepository,
                                  CareerJobSaveRepository careerJobSaveRepository,
                                  CareerMatchRepository careerMatchRepository,
                                  JobApplicationRepository jobApplicationRepository,
                                  InterviewSessionRepository interviewSessionRepository,
                                  CareerSearchRunRepository careerSearchRunRepository,
                                  CareerLanguageHelper languageHelper) {
        this.cvDocumentRepository = cvDocumentRepository;
        this.careerJobSaveRepository = careerJobSaveRepository;
        this.careerMatchRepository = careerMatchRepository;
        this.jobApplicationRepository = jobApplicationRepository;
        this.interviewSessionRepository = interviewSessionRepository;
        this.careerSearchRunRepository = careerSearchRunRepository;
        this.languageHelper = languageHelper;
    }

    @Transactional(readOnly = true)
    public CareerDtos.DashboardResponse buildDashboard(Long userId, String language) {
        String lang = languageHelper.normalize(language);
        List<CvDocumentEntity> cvs = cvDocumentRepository.findByUserIdOrderByCreatedAtDesc(userId);
        int primaryCvId = cvs.stream().filter(CvDocumentEntity::isPrimary).mapToInt(d -> d.getId().intValue()).findFirst().orElse(0);
        long savedJobs = careerJobSaveRepository.countByUser_IdAndSavedTrue(userId);
        int matchCount = careerMatchRepository.findByUser_IdOrderByCreatedAtDesc(userId).size();
        List<JobApplicationEntity> apps = jobApplicationRepository.findByUser_IdOrderByUpdatedAtDesc(userId);
        Map<String, Long> byStatus = apps.stream()
                .collect(Collectors.groupingBy(JobApplicationEntity::getStatus, Collectors.counting()));

        List<String> actions = new ArrayList<>();
        if (cvs.isEmpty()) {
            actions.add(languageHelper.message("dashboard.action.upload_cv", lang));
        }
        if (savedJobs == 0) {
            actions.add("Run a job search and save promising listings");
        }

        List<CareerDtos.CareerSearchResponse> recentRuns = careerSearchRunRepository.findByUser_IdOrderByCreatedAtDesc(userId)
                .stream()
                .limit(5)
                .map(this::toRunSummary)
                .collect(Collectors.toList());

        return CareerDtos.DashboardResponse.builder()
                .cvCount(cvs.size())
                .primaryCvId(primaryCvId)
                .savedJobs((int) savedJobs)
                .matchCount(matchCount)
                .applicationCount(apps.size())
                .interviewCount(interviewSessionRepository.findByUserIdOrderByStartedAtDesc(userId).size())
                .applicationsByStatus(byStatus)
                .recommendedActions(actions)
                .recentRuns(recentRuns)
                .build();
    }

    private CareerDtos.CareerSearchResponse toRunSummary(CareerSearchRunEntity entity) {
        return CareerDtos.CareerSearchResponse.builder()
                .runId(entity.getId())
                .status(entity.getStatus())
                .blockedReason(entity.getBlockedReason())
                .build();
    }
}
