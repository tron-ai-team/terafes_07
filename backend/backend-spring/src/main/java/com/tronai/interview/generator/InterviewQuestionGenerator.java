package com.tronai.interview.generator;

import com.tronai.interview.dto.InterviewConfigDto;
import com.tronai.interview.engine.InterviewTurnDecision;
import com.tronai.interview.engine.InterviewTurnEngine;
import com.tronai.interview.session.InterviewSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Opening-question helper for Interview Mode V2.
 * Follow-up turns are owned by {@link InterviewTurnEngine}.
 */
@Component
public class InterviewQuestionGenerator {

    private final InterviewTurnEngine turnEngine;

    @Autowired
    public InterviewQuestionGenerator(@Autowired(required = false) InterviewTurnEngine turnEngine) {
        this.turnEngine = turnEngine;
    }

    public InterviewQuestionGenerator() {
        this(null);
    }

    /**
     * Generates or selects the first question (Self-introduction).
     */
    public String generateFirstQuestion(InterviewConfigDto config) {
        com.tronai.language.ExperienceLanguage language =
                com.tronai.language.ExperienceLanguage.parseOrDefault(config.getLanguage(), com.tronai.language.ExperienceLanguage.JA);
        boolean isEnglish = language != com.tronai.language.ExperienceLanguage.JA;
        String company = config.getCompanyNameJa() != null && !config.getCompanyNameJa().isBlank()
                ? config.getCompanyNameJa()
                : (config.getCompanyName() != null ? config.getCompanyName() : "");

        if (language != com.tronai.language.ExperienceLanguage.JA && language != com.tronai.language.ExperienceLanguage.EN) {
            return openingIn(language, company);
        }
        if (isEnglish) {
            if (!company.isBlank()) {
                return "Thank you for interviewing with " + company + " today. Could you please start by introducing yourself and giving a brief overview of your background?";
            }
            return "Thank you for joining us today. Could you please start by introducing yourself and giving a brief overview of your background?";
        }

        if (!company.isBlank()) {
            return company + "の面接にお越しいただきありがとうございます。1分程度で自己紹介をお願いできますでしょうか？";
        }
        return "候補者さん、本日はありがとうございます。1分程度で自己紹介をお願いします。";
    }

    private static String openingIn(com.tronai.language.ExperienceLanguage language, String company) {
        String name = company == null ? "" : company;
        return switch (language) {
            case SI -> name.isBlank()
                    ? "කරුණාකර ඔබව හඳුන්වා දී ඔබේ පසුබිම කෙටියෙන් කියන්න."
                    : name + " සම්මුඛ පරීක්ෂණයට ස්තූතියි. කරුණාකර ඔබව හඳුන්වා දෙන්න.";
            case BN -> name.isBlank()
                    ? "অনুগ্রহ করে নিজের পরিচয় দিন এবং আপনার পটভূমি সংক্ষেপে বলুন।"
                    : name + " সাক্ষাৎকারে স্বাগতম। অনুগ্রহ করে নিজের পরিচয় দিন।";
            case NE -> name.isBlank()
                    ? "कृपया आफ्नो परिचय दिनुहोस् र आफ्नो पृष्ठभूमि छोटकरीमा भन्नुहोस्।"
                    : name + " को अन्तर्वार्तामा स्वागत छ। कृपया आफ्नो परिचय दिनुहोस्।";
            case MY -> name.isBlank()
                    ? "ကျေးဇူးပြု၍ မိမိကိုယ်ကို မိတ်ဆက်ပြီး နောက်ခံကို အကျဉ်းချုပ် ပြောပြပါ။"
                    : name + " အင်တာဗျူးကို ကြိုဆိုပါတယ်။ ကျေးဇူးပြု၍ မိမိကိုယ်ကို မိတ်ဆက်ပေးပါ။";
            default -> "Please introduce yourself and give a brief overview of your background.";
        };
    }

    /**
     * Compatibility wrapper — Interview V2 uses {@link InterviewTurnEngine#decide}.
     */
    public String generateNextQuestion(InterviewSession session, String latestAnswer) {
        if (turnEngine == null) {
            throw new IllegalStateException("InterviewTurnEngine is required for Interview Mode V2");
        }
        InterviewTurnDecision decision = turnEngine.decide(session, latestAnswer);
        String utterance = decision.interviewerUtterance();
        return utterance != null && !utterance.isBlank() ? utterance : decision.getNextQuestion();
    }
}
