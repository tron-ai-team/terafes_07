package com.tronai.career.i18n;

import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Component
public class CareerLanguageHelper {

    public static final Set<String> SUPPORTED = Set.of("en", "ja", "si", "bn", "ne", "my");

    private static final Map<String, Map<String, String>> MESSAGES = Map.ofEntries(
            Map.entry("match.title", Map.of(
                    "en", "CV-to-job match analysis",
                    "ja", "履歴書と求人のマッチ分析",
                    "si", "CV-රැකියා ගැලපීම් විශ්ලේෂණය",
                    "bn", "সিভি-চাকরি মিল বিশ্লেষণ",
                    "ne", "सिभी-रोजगार मिलान विश्लेषण",
                    "my", "CV-အလုပ်ကိုက်ညီမှု ခွဲခြမ်းစိတ်ဖြာချက်"
            )),
            Map.entry("match.blocker.japanese", Map.of(
                    "en", "Japanese requirement may not be met",
                    "ja", "日本語要件を満たしていない可能性があります",
                    "si", "ජපන් භාෂා අවශ්‍යතාව සපුරා නැත",
                    "bn", "জাপানি ভাষার প্রয়োজনীয়তা পূরণ নাও হতে পারে",
                    "ne", "जापानी भाषा आवश्यकता पूरा नहुन सक्छ",
                    "my", "ဂျပန်ဘာသာ လိုအပ်ချက် မပြည့်မီနိုင်ပါ"
            )),
            Map.entry("dashboard.action.upload_cv", Map.of(
                    "en", "Upload or update your primary CV",
                    "ja", "主要な履歴書をアップロードまたは更新してください",
                    "si", "ඔබගේ ප්‍රධාන CV එක උඩුගත කරන්න",
                    "bn", "আপনার প্রাথমিক CV আপলোড করুন",
                    "ne", "आफ्नो प्राथमिक सिभी अपलोड गर्नुहोस्",
                    "my", "မူလ CV ကို တင်ပါ"
            )),
            Map.entry("ops.blocked.oauth", Map.of(
                    "en", "OAuth authorization required — integration blocked",
                    "ja", "OAuth 認可が必要です — 連携はブロックされています",
                    "si", "OAuth අනුමැතිය අවශ්‍ය — ඒකාබද්ධතාව අවහිරයි",
                    "bn", "OAuth অনুমোদন প্রয়োজন — ইন্টিগ্রেশন ব্লক",
                    "ne", "OAuth प्राधिकरण चाहिन्छ — एकीकरण रोकिएको",
                    "my", "OAuth ခွင့်ပြုချက် လိုအပ် — ပေါင်းစည်းမှု ပိတ်ထား"
            ))
    );

    public String normalize(String language) {
        if (language == null || language.isBlank()) {
            return "en";
        }
        String code = language.trim().toLowerCase(Locale.ROOT);
        if (code.length() > 2) {
            code = code.substring(0, 2);
        }
        return SUPPORTED.contains(code) ? code : "en";
    }

    public String message(String key, String language) {
        String lang = normalize(language);
        Map<String, String> table = MESSAGES.get(key);
        if (table == null) {
            return key;
        }
        return table.getOrDefault(lang, table.getOrDefault("en", key));
    }
}
