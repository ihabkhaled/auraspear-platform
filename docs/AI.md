# AI Architecture & Governance — AuraSpear

AuraSpear is AI-first: AI is woven through investigation, not bolted on. This
document describes the live AI subsystem (`apps/api/src/modules/ai`), the shared
building blocks (`@auraspear/ai`), and the governance/safety model.

> Source of truth for behavior is the code. This doc is the map; see
> `apps/api/CLAUDE.md` (§AI rules) and `apps/web/CLAUDE.md` (§AI surfaces).

## Providers & the cascade

The platform is provider-agnostic and tries every configured AI connector in
priority order, using the first healthy one:

```
bedrock → llm_apis → openclaw_gateway → (rule-based fallback)
```

| Provider         | Kind               | Notes                                                     |
| ---------------- | ------------------ | --------------------------------------------------------- |
| AWS Bedrock      | `bedrock`          | Direct cloud AI (Claude models)                           |
| LLM APIs         | `llm_apis`         | OpenAI-compatible endpoints (GPT, Claude API, local LLMs) |
| OpenClaw Gateway | `openclaw_gateway` | AI gateway/orchestration layer                            |

Rule: **never short-circuit to the rule-based fallback after a single provider
failure** — try all configured connectors first; only fall back when all fail or
none are configured. The provider/model used is recorded in the audit log and in
every result's provenance. The provider-agnostic routing logic is implemented in
`@auraspear/ai` (`routeProviders` / `selectProvider` in `model-router.ts`); the
api binds it to real SDK calls.

## AI surfaces (what ships today)

- **AI Chat** (`/ai-chat`) — threaded LLM conversations with per-user attribution
  and memory injection.
- **AI Findings** (`/ai-findings`) — a searchable workspace for all AI-generated
  findings (Postgres full-text search, filters, KPIs, apply/dismiss).
- **Cross-chat memory** — `UserMemory` facts/preferences extracted asynchronously
  after each message, stored with embeddings, retrieved by cosine similarity and
  injected into the system prompt. Non-blocking by design.
- **Investigation copilots** — alert triage, case copilot, IOC/intel enrichment,
  detection-rule copilot, SOAR panel (see `apps/web/src/components/*` AI panels).
- **AI agents + orchestrator** — configurable agents dispatched through
  `OrchestratorService`, which validates: agent enabled, automation mode,
  budget/quota, provider availability, and approval requirements before
  enqueuing an `AI_AGENT_TASK` job.
- **Evaluation** (`ai/eval`) and **simulation** (`ai/simulation`) modules.

## Job system

AI work runs as jobs with registered handlers (every `JobType` must have one):
`AI_AGENT_TASK`, `MEMORY_EXTRACTION`, `REPORT_GENERATION`, plus the non-AI
`CONNECTOR_SYNC`, `DETECTION_RULE_EXECUTION`, `CORRELATION_RULE_EXECUTION`,
`NORMALIZATION_PIPELINE`, `SOAR_PLAYBOOK`, `HUNT_EXECUTION`. Stale RUNNING jobs
are auto-recovered; the processor logs Redis connection-state changes.

## Output contracts (`@auraspear/ai`)

Every AI result is **attributable, confidence-scored, and source-cited**:

- `AiProvenance` — provider, model, confidence, prompt version, token usage, time.
- `AiFinding`, `RiskScore`, `IocEnrichment` — structured, MITRE-mapped where
  relevant, with `AiCitation[]`.
- The web renderers show loading/error/confidence/provider attribution and a
  regenerate affordance on every AI surface.

## Safety & approval policy (`@auraspear/ai/safety`)

AI must not silently execute destructive actions. Every action is classified:

| Category            | Meaning                                                  |
| ------------------- | -------------------------------------------------------- |
| `analysis-only`     | read-only reasoning, no side effects                     |
| `suggested`         | a recommendation the analyst acts on manually            |
| `approval-required` | side-effecting; needs explicit human approval first      |
| `auto-allowed`      | pre-authorized, allow-listed, non-destructive automation |

`evaluateApproval()` is conservative: **anything destructive or high/critical
risk requires approval**, and `auto-allowed` only bypasses approval for
non-destructive low/medium-risk actions. Approval-required actions must create a
persisted `ApprovalRequest` before execution.

## Redaction (`@auraspear/ai/redaction`)

`redact()` strips secrets/PII (private keys, JWTs, AWS keys, bearer tokens,
`secret=`/`password=` pairs, emails, IPv4) from context **before** it is sent to
a model or persisted in a transcript. Investigative IOCs can be preserved via the
`keep` list (e.g. keep the IP you are investigating). Connector credentials are
always encrypted at rest (AES-256-GCM) and never sent to models.

## Evaluation (`@auraspear/ai/evaluators`)

`runEval()` runs golden cases through a (real or mocked) producer and scores
assertions, with `safety` assertions that fail the whole run regardless of pass
rate. Intended for CI regression gates: hallucination checks, schema-shape
checks, and safety checks. Provider calls are injected so evals can run offline.

## Prompt lifecycle (`@auraspear/ai/prompts`)

Prompts are versioned (`PromptTemplate { key, version, template }`) and
`renderPrompt()` binds runtime variables. The version is recorded in
`AiProvenance.promptVersion` so a finding can be traced to the exact prompt, and
evals can pin a version.

## Governance checklist

- [x] Provider/model recorded in audit log + result provenance.
- [x] Token/cost surfaced (AI FinOps surface; `tokensIn`/`tokensOut` in provenance).
- [x] PII/secret redaction before model calls and transcript storage.
- [x] Approval policy for side-effecting actions; persisted approval records.
- [x] Tenant-scoped: AI investigation validates alert/resource tenant ownership.
- [ ] Per-tenant AI opt-in/out toggle (roadmap).
- [ ] Golden-dataset eval gate wired into CI (roadmap — harness exists in `@auraspear/ai`).

## Roadmap

Strengthen AI _outcomes_: AI case timeline builder, explainable risk scoring at
scale, SOAR playbook recommender with impact preview, AI report writer
(weekly SOC / incident / compliance), prompt-snapshot regression suite in CI, and
a per-tenant model/provider router UI. See `docs/ROADMAP.md`.
