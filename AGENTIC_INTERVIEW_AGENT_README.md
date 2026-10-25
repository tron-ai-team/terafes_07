# TRON AI — Agentic Interview Preparation System
## Autonomous Multi-Step AI Agent Architecture & Demonstration Guide

---

### 1. What "Agentic AI" Means in this Implementation

Most modern AI features are simple single-turn query/response systems:
```
User Prompt ──▶ [ Single LLM Call ] ──▶ Final Answer
```
In contrast, **TRON Interview Preparation Agent** is an **autonomous, bounded multi-step Agentic AI loop**:
```
                   Candidate Goal
                         │
                         ▼
┌────────────────── Agent State ──────────────────┐
│  • Goal & Target Role   • Safe Step History    │
│  • Accumulated Verified Observations            │
└────────────────────────┬────────────────────────┘
                         │
                         ▼
                   Agent Planner (ModelManager / Qwen3:8b)
                         │
                         ▼
                   Safe Tool Decision
                         │
                         ▼
                AgentToolRegistry
                         ├── CvAnalysisTool
                         ├── JobAnalysisTool
                         ├── GapAnalysisTool
                         ├── InterviewStrategyTool
                         └── QuestionGenerationTool
                         │
                         ▼
                Tool Execution & Observation
                         │
                         ▼
         Is Goal Fulfilled or Max Steps Reached?
         ├── NO  ──▶ Update Observations ──▶ Loop to Planner
         └── YES ──▶ FINISH ──▶ Final Preparation Package
```

The system demonstrates true agency:
1. **Goal Understanding:** Takes a complex preparation request (company, role, job requirements, optional CV).
2. **Autonomous Tool Selection:** The LLM inspects its current safe observations and decides the next single tool action to take.
3. **Observation-Driven Decisions:** The output of earlier tools (e.g. CV verified skills, extracted job requirements) becomes the input for subsequent tools (e.g. Gap Analysis identifying missing cloud skills).
4. **Tailored Output Synthesis:** Rather than generic interview questions, questions directly address the candidate's discovered gaps and the company's specific architectural requirements.
5. **Bounded Execution & Safety:** Hard limit of 8 steps, repeat action loop protection, deterministic fallback, zero arbitrary code execution, zero web scraping, and multi-tenant isolation.

---

### 2. Architecture & Components

```
Client (React + TypeScript + Vite :5174)
   │
   │  Authenticated REST (JWT Bearer)
   ▼
Spring Boot Backend (:8080)
   ├── AgentController (/api/v1/agents/**)
   │     │
   │     ▼
   ├── AgentService (Orchestration, DB Transactions, Multi-tenant Isolation)
   │     │
   │     ▼
   ├── AgentRunner (Bounded loop, loop protection, metrics calculation)
   │     │
   │     ├──▶ AgentPlanner (LLM decision generation via Qwen3:8b)
   │     │
   │     └──▶ AgentToolRegistry (Strict allowlisted tool dispatch)
   │            ├── [CV_ANALYSIS]            CvAnalysisTool
   │            ├── [JOB_ANALYSIS]           JobAnalysisTool
   │            ├── [GAP_ANALYSIS]           GapAnalysisTool
   │            ├── [INTERVIEW_STRATEGY]     InterviewStrategyTool
   │            └── [QUESTION_GENERATION]    QuestionGenerationTool
   │
   ├── MySQL Persistence (Flyway Migration V3)
   │     ├── agent_runs
   │     ├── agent_steps
   │     └── agent_results
   │
   └── InterviewService (Seamless persistent interview launch from agent results)
```

---

### 3. Safe Tool Specifications

All tools implement the strict `AgentTool` contract:

| Tool Action | Tool Class | Inputs | Responsibilities | Safe Failure / Fallback Behavior |
|---|---|---|---|---|
| `CV_ANALYSIS` | `CvAnalysisTool` | `cvId`, `userId` | Loads verified parsed profile from MySQL/MinIO. Extracts skills, education, experience without hallucinating unverified skills. | If `cvId` is null, returns status `skipped` with safe notification; agent continues gracefully. |
| `JOB_ANALYSIS` | `JobAnalysisTool` | `companyName`, `jobPosition`, `jobDescription` | Structured requirement extraction: required skills, preferred skills, responsibilities, technical keywords. | Retries once on malformed JSON; falls back to deterministic rule-based text extractor. |
| `GAP_ANALYSIS` | `GapAnalysisTool` | `candidateProfile`, `jobAnalysis` | Strict evidence rule: a skill is marked `matchingSkills` ONLY if candidate CV contains verified evidence. Missing skills become `skillGaps`. | Categorizes known vs missing vs unknown. Guarantees no fabricated candidate experience. |
| `INTERVIEW_STRATEGY` | `InterviewStrategyTool` | `jobAnalysis`, `gapAnalysis`, `companyName` | Synthesizes tailored roadmap: priority topics, technical, behavioral, and communication prep. | Prioritizes candidate's critical skill gaps and company architecture profile. |
| `QUESTION_GENERATION` | `QuestionGenerationTool` | `companyName`, `jobPosition`, `gapAnalysis`, `interviewStrategy` | Generates 5 targeted practice questions with category, difficulty, why-it-matters rationale, and candidate preparation hints. | Questions directly target candidate's discovered gaps (e.g. Cloud/AWS and DB latency). |

---

### 4. Safety & Security Guardrails

The agent operates strictly within safe sandbox constraints:
- **No Arbitrary Execution:** No shell commands, no arbitrary Java reflection, no class loading.
- **No Web Crawling or Automation:** No Playwright, no browser automation, no external scraping, no credential harvesting, no automated job submissions.
- **Strict Allowlist:** The planner can ONLY select actions defined in `AgentAction` enum (`CV_ANALYSIS`, `JOB_ANALYSIS`, `GAP_ANALYSIS`, `INTERVIEW_STRATEGY`, `QUESTION_GENERATION`, `FINISH`). Any unknown action is rejected.
- **Bounded Step Execution:** Maximum 8 steps (`MAX_AGENT_STEPS = 8`). Infinite loops are structurally impossible.
- **Repeat-Action Loop Protection:** If the planner attempts to repeat an identical tool call without new observation data, the runner overrides it with the deterministic fallback plan.
- **Privacy & Redaction:** Hidden chain-of-thought, internal raw LLM prompts, JWTs, and passwords are strictly excluded from all database entities, logs, and frontend responses.
- **Multi-Tenant Isolation:** All runs and CV access require valid JWT authentication. Users can never view, update, or delete another user's agent runs.

---

### 5. API Reference

#### Run Interview Preparation Agent
- **Endpoint:** `POST /api/v1/agents/interview-prep/run`
- **Headers:** `Authorization: Bearer <jwt_access_token>`
- **Request Body:**
```json
{
  "goal": "Prepare me for a Backend Engineer interview at LINE Yahoo.",
  "companyName": "LINE Yahoo",
  "jobPosition": "Backend Engineer",
  "jobDescription": "Java, Spring Boot, REST API development, SQL databases, Git, team development, testing, Japanese communication. Experience with cloud infrastructure is preferred.",
  "language": "ja",
  "cvId": 5
}
```
- **Response Structure (200 OK):**
```json
{
  "runId": "e01c5fcb-36af-4aa6-b239-e9fb47f6c004",
  "status": "completed",
  "goal": "Prepare me for a Backend Engineer interview at LINE Yahoo.",
  "companyName": "LINE Yahoo",
  "jobPosition": "Backend Engineer",
  "steps": [
    {
      "step": 1,
      "action": "CV_ANALYSIS",
      "description": "Analyzed candidate CV to extract verified skills and experience.",
      "status": "completed"
    },
    {
      "step": 2,
      "action": "JOB_ANALYSIS",
      "description": "Extracted technical and behavioral requirements for LINE Yahoo.",
      "status": "completed"
    },
    {
      "step": 3,
      "action": "GAP_ANALYSIS",
      "description": "Identified skill gaps between candidate profile and role requirements.",
      "status": "completed"
    },
    {
      "step": 4,
      "action": "INTERVIEW_STRATEGY",
      "description": "Developed tailored preparation strategy targeting identified gaps.",
      "status": "completed"
    },
    {
      "step": 5,
      "action": "QUESTION_GENERATION",
      "description": "Generated targeted practice questions addressing gaps and strategy.",
      "status": "completed"
    },
    {
      "step": 6,
      "action": "FINISH",
      "description": "All preparation artifacts gathered successfully.",
      "status": "completed"
    }
  ],
  "result": {
    "candidateStrengths": ["Java", "Spring Boot", "REST APIs", "Git"],
    "skillGaps": ["SQL / Databases", "Cloud / AWS (Preferred)"],
    "priorityTopics": ["SQL / Databases", "Cloud / AWS (Preferred)", "Java Deep-Dive & Architecture"],
    "interviewStrategy": { ... },
    "practiceQuestions": [
      {
        "question": "...",
        "category": "System Architecture",
        "difficulty": "Hard",
        "whyThisQuestionMatters": "Evaluates knowledge of low-latency API design under LINE Yahoo traffic scales.",
        "preparationHint": "Mention Redis caching, asynchronous messaging, and connection pooling."
      }
    ]
  },
  "metrics": {
    "stepsExecuted": 6,
    "toolsUsed": ["CV_ANALYSIS", "JOB_ANALYSIS", "GAP_ANALYSIS", "INTERVIEW_STRATEGY", "QUESTION_GENERATION"],
    "model": "qwen3:8b",
    "durationMs": 5280
  }
}
```

#### List Agent Run History
- **Endpoint:** `GET /api/v1/agents/runs`
- **Headers:** `Authorization: Bearer <jwt_access_token>`

#### Get Agent Run Details
- **Endpoint:** `GET /api/v1/agents/runs/{runId}`
- **Headers:** `Authorization: Bearer <jwt_access_token>`

#### Launch Interactive Interview Directly from Agent
- **Endpoint:** `POST /api/v1/agents/runs/{runId}/start-interview`
- **Headers:** `Authorization: Bearer <jwt_access_token>`
- **Response:** `InterviewStartResponse` containing `interviewId`, initial question, and transcript.

---

### 6. Teacher Demonstration Instructions

1. **Log in or Register** at `http://localhost:5174/auth`.
2. Navigate to **Interview Agent** in the left sidebar (or URL `http://localhost:5174/agent`).
3. Click the **"Load Teacher Demo Data"** button in the top right.
   - This automatically populates:
     - Goal: `Prepare me for a Backend Engineer interview at LINE Yahoo.`
     - Company: `LINE Yahoo`
     - Position: `Backend Engineer`
     - Job Description: `We are looking for a backend engineer with knowledge of Java, Spring Boot, REST API development, SQL databases, Git, team-based software development, testing, and Japanese communication skills. Experience with cloud infrastructure is preferred.`
     - Language: `日本語`
4. Optionally choose an uploaded CV from the dropdown (or leave as "No CV" to see general analysis).
5. Click **"RUN AGENT"**.
6. **Observe the Live Execution Pipeline:**
   - Watch the animated step-by-step progress cards:
     - `✓ Step 1: CV_ANALYSIS`
     - `✓ Step 2: JOB_ANALYSIS`
     - `✓ Step 3: GAP_ANALYSIS`
     - `✓ Step 4: INTERVIEW_STRATEGY`
     - `✓ Step 5: QUESTION_GENERATION`
   - Show the teacher the **Agent Metrics bar** (`Status: COMPLETED`, `Tools Used: 5`, `Model: Qwen3 8B`, `Execution Duration: ~5.3s`).
   - Show the **Observation Influence Proof**:
     - Point out how Candidate Strengths (Java, Spring Boot) match the CV.
     - Point out how Skill Gaps (Cloud / AWS) reflect the job description requirement.
     - Point out how the Practice Questions specifically target the candidate's Cloud and Architecture gaps.
7. Click **"Start Interactive Practice Interview with this Preparation"** to demonstrate seamless integration into TRON's real-time interview simulator.

---

### 7. Known Limitations & Future Work

- **Browser Automation Deferred:** External job-site scraping and automatic form submission are deliberately disabled to comply with strict academic safety constraints.
- **Model Bound:** Configured by default to local Ollama `qwen3:8b`. Can be seamlessly mapped to other profiles via TRON `ModelManager`.
- **Token Limits:** Job descriptions are accepted up to 100,000 characters; longer documents are truncated safely to fit local model context windows.
