# TRON Backend Intelligence V1 — Audit

**Mission:** TRON-BACKEND-INTELLIGENCE-V1-20261114  
**Verified base:** `origin/main` @ `740d6b91df5c9cb08854efc5ebf57fef49bbba53`  
**Worktree:** `C:/Users/Thushan/Projects/tron-backend-intelligence-v1`  
**Branch:** `feature/tron-backend-intelligence-v1`  
**UI branch untouched:** `feature/tron-mobile-home-reference-20261114` (separate worktree)

## Actual call graph (pre-change)

```text
POST /api/v1/chat
  → ChatController.chat
  → ChatService.processChat
       → LanguageService.buildSystemPrompt(searchMode)   # static note only
       → generateWithGatewayOrLocal / AiGateway
       → buildSearchInfo(searchMode) AFTER generation
            OFF → skipped
            ON/AUTO → unavailable "Search provider not configured"
  WebResearchService ← CompanyAnalysisService only (Tavily/Firecrawl)
  VoiceService → STT → LLM → TTS (no searchMode)
  InterviewTurnEngine → AiGateway JSON interviewer
```

## Gaps found

| Gap | Evidence |
|---|---|
| Chat never searches | `ChatService.buildSearchInfo` always `performed=false` |
| Search after LLM | Prompt had no hits; Tavily unused by chat |
| No SearXNG / Serper / Groq browser_search / OpenRouter web tool | Repo search: absent |
| Voice skipped GTX FAST lock | `VoiceService.generateVoiceReply` vs Chat GTX path |
| Invalid searchMode → silent AUTO | `"yes"` treated as auto |

## Provider locks (preserved)

- FAST → `OLLAMA_GTX` when `TRON_AI_GTX_FAST_MODE=true` (`AiModelRouter` + ChatService)
- SMART → RTX `OLLAMA` when `TRON_AI_RTX_SMART_MODE=true`
- Search must not reroute inference

## Files changed for V1 (implementation)

- New: `com.tronai.ai.research.search.*` (policy, orchestrator, SearXNG, Serper, grounding, cache, budget)
- Wired: `ChatService`, `LanguageService`, `SearchInfo`, `VoiceService`/`VoiceController`
- Cloud tools: `OpenAiCompatibleClient`, `GroqGatewayProvider`, `OpenRouterGatewayProvider`, `AiRequestContext`
- Config: `application.yml` `tron.search.*`, `.env.example`
- Docs: this audit + architecture + API contract + SearXNG runbook + test matrix + readiness

## Risk

Medium for search enablement (network/cost); **low** while `TRON_WEB_SEARCH_V1_ENABLED=false` (default).
