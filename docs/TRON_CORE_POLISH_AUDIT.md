# TRON Core Polish — Audit

**Mission:** TRON-CORE-POLISH-2026-11-14  
**Base:** `origin/main` @ `d9df8dea35ac09021f2e9472de01ca8111aaefc2` (PR #25 GTX FAST merge; verified ancestor)  
**Worktree:** `../tron-core-polish-20261114` (isolated; original `tron-ai` workspace left unchanged)  
**Branch:** `feature/tron-core-polish-20261114`

## Ground truth

| Item | Value |
|---|---|
| Production image (owner report) | Not modified by this mission |
| Public site | `https://tronai.tech` |
| Public API | `https://api.tronai.tech` |
| FAST | GTX / `OLLAMA_GTX` / `qwen3:8b` — preserved |
| SMART | RTX / `OLLAMA` / `qwen3.5:9b-q4_K_M` — preserved |
| CLOUD | Existing cloud providers — preserved |

## Core navigation map (public UI)

| Destination | Route | Guest |
|---|---|---|
| Home | `/` | Landing |
| AI Chat | `/chat` | Sign-in required |
| AI Voice | `/voice` | Sign-in required |
| Interview Practice | `/career/interview` (+ setup/room/feedback/history) | Sign-in required |
| AI CV Builder | `/career/cv-builder` | Sign-in required |
| Profile / Candidate Profile | `/profile`, `/career/profile` | Sign-in required |
| Auth | `/auth`, `/auth/callback` | Public |
| Unknown | `*` | Branded 404 |
| Workspace / Jobs / Company / Mentor / Agent | legacy paths | Feature unavailable (source preserved) |

## Observed defects (baseline → status)

| ID | Severity | Observation | Status |
|---|---|---|---|
| P0-NAV-01 | P0 | Authenticated Get Started → `/workspace` | **Fixed** → `/chat` |
| P0-AUTH-01 | P0 | No shared route guard; guest protected routes not clearly sign-in vs 404 | **Fixed** `RequireAuth` |
| P0-404-01 | P0 | `*` redirected to `/` (masked 404) | **Fixed** branded `NotFoundPage` |
| P0-NAV-02 | P0 | TopBar/Sidebar advertised Workspace, Job Finder, Interview Agent | **Fixed** core-only nav |
| P0-CTA-01 | P0 | Landing navbar “Open Workspace” / Desktop Agent feature entry | **Fixed** |
| P1-CHAT-01 | P1 | Offline banner told users to start `localhost:8080` | **Fixed** user-facing copy |
| P1-CHAT-02 | P1 | Attachment toast claimed “ingestion ready” without upload | **Fixed** affordance hidden |
| P1-AUTH-02 | P1 | `returnTo` not sanitized (open redirect risk) | **Fixed** `safeReturnTo` |
| P1-INT-01 | P1 | Interview dashboard CV card → legacy upload | **Fixed** → CV Builder |
| P1-INT-02 | P1 | Interview room init failure lacked recovery UX | **Fixed** recovery card |
| P1-VOICE-01 | P1 | Tab hide could leave mic active | **Fixed** visibility stop |
| P1-MOBILE-01 | P1 | Layout used `h-screen` (keyboard / mobile viewport) | **Fixed** `100dvh` + safe-area |
| P1-CAREER-01 | P1 | Career Center advertised Job Finder / Company Analysis / Mentor | **Fixed** slim core landing |
| — | — | Live Chat/Voice/Interview/CV E2E against production accounts | **NOT TESTED** (no mutating prod auth in this mission) |
| — | — | Physical mic / iOS Safari / Android Chrome | **NOT TESTED** |

## Backend / API notes

- Existing Spring AI gateway GTX FAST lock tests (`AiModelRouterTest`, `AiProfileServiceTest`) **PASS** locally.
- No schema migrations, no production env changes, no Compose/CD edits.
- Unfinished feature **page source files** remain under `frontend/src/pages/`; public routes no longer mount them.

## Out of scope preserved

Workspace/Desktop Agent, Job Finder, Company Analysis, Mentor, Admin Console internals, GPU/Tailscale/DNS, production MySQL data.
