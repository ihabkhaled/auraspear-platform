# AI_MEMORY

Stable AI truths. Full detail in `docs/AI.md`, `docs/ai/`, `rules/ai/`,
`packages/ai`.

- **AI can analyze and suggest. AI must NOT silently execute destructive
  security/infrastructure actions.** Destructive/high-risk actions are
  `approval-required` → a persisted `ApprovalRequest` + permission must exist
  before execution. Conservative classification via `@auraspear/ai` `safety.ts`.
- **Provider routing is a cascade**: `bedrock → llm_apis → openclaw_gateway →
rule-based`. Try ALL configured connectors before falling back; never
  short-circuit to rule-based after one failure. Record provider/model in the
  audit log and in result provenance.
- **Every AI output is attributable**: provenance (provider, model, confidence,
  prompt version, token usage) + citations where applicable. The UI shows
  loading/error/confidence/provider and a regenerate affordance.
- **Never render raw AI output as HTML.** Render as markdown (safe) or plain text.
  Use the standardized `ai-renderer` components for structured blocks.
- **Redaction**: strip PII/secrets before sending context to a model and before
  persisting transcripts (`@auraspear/ai` `redact()`).
- **AI memory** (`UserMemory`) is **tenant-scoped** and must **never store
  secrets**; retrieval is non-blocking (a memory failure never crashes chat).
- **Tenant scoping**: AI investigation validates resource (alert/case) tenant
  ownership before acting.
- **Evaluation**: golden-case harness in `@auraspear/ai` `evaluators.ts`; `safety`
  assertions fail a run regardless of pass rate.
- Related: [[SECURITY_MEMORY]] [[PROJECT_MEMORY]].
