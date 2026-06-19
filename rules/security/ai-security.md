# Rules — AI security

> **Read `../../AGENTS.md` first** (loading order + the one rule: understand
> before you edit). The binding invariants are `AGENTS.md` **§7 "AI safety
> invariants"** (redact before model calls, tenant-scoped memory with no secrets,
> approval-required destructive actions, provenance + no raw AI HTML) and **§6**
> (tenant isolation, connector secrets AES-256-GCM). Then read
> `../../apps/api/CLAUDE.md` rules **#26, #48, #56, #88, #89, #95–#100** and the
> "AI Agent Configuration Rules", and `../../apps/web/CLAUDE.md` rules **#43, #44,
> #46, #51, #55, #58, #59**. Siblings: `./secret-handling.md` (connector
> encryption + redaction sets), `../frontend/ai-ui-rules.md` (the UI side of these
> same invariants), `../../skills/ai/add-ai-feature.md` (the recipe),
> `../../docs/AI.md` + `../../docs/ai/` (architecture).

These are **hard constraints** for anything that builds a prompt, calls a model,
persists an AI transcript/finding/memory, or surfaces an AI-proposed action —
i.e. `packages/ai/**` and `apps/api/src/modules/ai/**` (plus the connector AI
adapters in `apps/api/src/modules/connectors/services/{bedrock,llm-apis,openclaw-gateway}.service.ts`).
A violation here is a **leaked secret/PII to a third-party model**, a
**cross-tenant data leak**, an **unapproved destructive action**, or **XSS via AI
output** — not a style nit. Every claim below maps to real code, cited by path.

The provider-agnostic primitives live in `packages/ai` (`redaction.ts`,
`safety.ts`, `types.ts`, `model-router.ts`); the live subsystem is
`apps/api/src/modules/ai` (`ai.service.ts` orchestration, `memory/`, `writeback/`,
`orchestrator/`, `chat/`, `usage-budget/`, `feature-catalog/`, `prompt-registry/`).

---

## 1. Redact PII/secrets BEFORE every model call (and before persisting transcripts)

- `packages/ai/src/redaction.ts` is the canonical redactor: `redact(input, keep?)`
  strips private keys, JWTs, AWS access keys (`AKIA`/`ASIA`), bearer tokens,
  `secret/password/api_key/token = …` pairs, emails, and IPv4 — returning
  `{ text, counts, redactedAny }` (`RedactionKind` enum). It is pure and
  network-free, so it is safe to run on every prompt and every stored transcript.
- **Run `redact()` on user/free-text and on raw event data before it leaves the
  tenant boundary.** Today the API still assembles prompts from raw fields —
  `aiInvestigate()` packs `alertRawData` (`JSON.stringify(rawEvent).slice(0,2000)`),
  `sourceIp`, `destinationIp`, `agentName` straight into `context`
  (`apps/api/src/modules/ai/ai.service.ts:175-196`); `aiHunt`/`aiExplain` pass
  `dto.query` / `body.prompt` verbatim (`:145-216`); chat extraction joins raw user
  messages into the LLM prompt (`apps/api/src/modules/ai/memory/memory-extraction.service.ts:40,54`).
  **No `@auraspear/ai` `redact()` call exists in `apps/api/src/modules/ai` yet** —
  any new prompt-building path MUST redact, and existing paths should be migrated,
  not extended. Build the context, then `redact()` each free-text/raw field in
  `assembleFinalPrompt`'s inputs before invoking a connector.
- Use the `keep` parameter only with a documented reason (e.g. keep
  `RedactionKind.IPV4` when the IP _is_ the IoC under investigation) — never blanket-disable.
- Redaction is **defense in depth, not a substitute** for the secret-handling
  rules in `./secret-handling.md`. Secrets must never be in the data in the first place.

## 2. AI memory is tenant- AND user-scoped, holds no secrets

- `UserMemory` reads/writes go through the per-tenant delegate; every query in
  `apps/api/src/modules/ai/memory/user-memory.service.ts` is scoped by
  `{ tenantId, userId }` and mutations call `verifyOwnership(tenantId, userId, id)`
  first (`:69,88`). `deleteAllMemories` uses `updateMany({ where: { tenantId, userId } })`
  (`:99`). Retrieval (`memory-retrieval.service.ts`) filters by `tenantId` before
  cosine-similarity ranking. Mirror this — **never** load or mutate memory by `id` alone.
- **Known gap to fix, not copy:** `memory-extraction.service.ts` updates/deletes
  by `where: { id: mem.existingMemoryId }` **without `tenantId`** (`:163-178`).
  That violates `AGENTS.md` §6 and `apps/api/CLAUDE.md` **#26** ("every Prisma
  `update()`/`delete()` MUST include `tenantId`"). When you touch this file, scope
  it to `{ id, tenantId, userId }` and verify ownership first. Do not replicate the pattern.
- **Memory must not store secrets/credentials.** The extraction prompt already
  says "do NOT extract temporary conversational details"
  (`memory-extraction.service.ts:90-95`), but the model is not a security control —
  `redact()` the message text (§1) before it is embedded and stored
  (`applyExtractedMemories` → `generateEmbedding` → `create`, `:148-160`).
- AI transcripts are sensitive: support redaction/retention. `ai-transcript.service.ts`
  has `redactThread(tenantId, threadId)` and refuses to redact a thread under legal
  hold (`:163-181`). Frontend **must never** store transcripts/memories in
  `localStorage` (`apps/web/CLAUDE.md` **#46, #55**).

## 3. AI may analyze/suggest — destructive actions are approval-required

- `packages/ai/src/safety.ts` is the policy: `AiActionCategory`
  (`analysis-only`, `suggested`, `approval-required`, `auto-allowed`) +
  `evaluateApproval(action)`. It is **conservative by design** — anything
  `destructive`, anything `HIGH`/`CRITICAL` risk, and anything explicitly
  `approval-required` returns `requiresApproval: true`; only non-destructive,
  allow-listed `auto-allowed` low/medium-risk bypasses approval (`safety.ts:47-64`).
  Classify every AI-proposed action through this, never ad-hoc booleans.
- **No silent execution.** Per `apps/api/CLAUDE.md` **#97**, every
  approval-required action MUST create an `ApprovalRequest` record **before**
  execution — never execute on the strength of the AI response alone. The AI
  subsystem proposes; a human + a real `@RequirePermission` gate disposes.
- Writeback findings are proposals, not actions: a finding is created in `proposed`
  state and only an authorized user transitions it (`PATCH /ai/findings/:id/status`,
  proposed → applied/dismissed with transition validation in
  `apps/api/src/modules/ai/writeback/ai-writeback.service.ts:76-99`). Applying a
  finding that mutates security/infra state is itself an approval-required action.
- Provider routing must **not** short-circuit to a destructive default: the cascade
  tries all configured connectors before any fallback (`apps/api/CLAUDE.md` **#88**;
  `routeProviders`/`selectProvider` in `packages/ai/src/model-router.ts`;
  `tryConnectorsInOrder` in `ai.service.ts:906-929`). Rule-based fallback only
  triggers when **all** providers fail, and is labeled `model: 'rule-based'`
  (`apps/web/CLAUDE.md` **#30**). **Never** add a `BEDROCK_MOCK`/env-gated mock
  path (`apps/api/CLAUDE.md` **#89**).

## 4. Provenance + audit on every AI output

- Every AI output is attributable. `packages/ai/src/types.ts` `AiProvenance`
  carries `provider`, `model`, optional `confidence` (0..1), `promptVersion`,
  `tokensIn/Out`, `generatedAtIso`; `AiFinding`/`RiskScore`/`IocEnrichment` embed
  `provenance` + `citations` (`AiCitation.sourceRef`). Populate these — never
  return a bare string from a model call.
- The API records provider/model/tokens/latency on **every** task:
  `executeAiTask` → `recordUsageAndAudit` → `recordTokenUsage` +
  `logFeatureAudit` + structured `appLogger` event
  (`apps/api/src/modules/ai/ai.service.ts:411,516-598`); agent tasks audit via
  `logAgentTaskAudit`/`buildAgentTaskAuditRecord` (`:307-335`). Audit rows go
  through `aiRepository.createAuditLog` with `tenantId`, `actor`, `action`,
  `model`, token counts, duration (`logAudit`, `:1535-1555`). **Any new AI entry
  point MUST audit** the same way (who, tenant, provider, model, tokens, outcome).
- Token usage feeds per-agent quota (`incrementUsage`) and the tenant monthly
  budget (`usageBudgetService.recordUsage`, `:529-549`); quota/budget are checked
  **before** the provider call (`validateAgentQuota`/`validateGlobalBudget`,
  `:440-460`). Do not bypass these gates.
- Findings persist their provenance: `confidence: aiResponse.confidence ?? null`,
  `agentId`, `sourceModule`, `tenantId` are stored on the finding
  (`ai-writeback.service.ts:244-246, 264-269`) so every AI artifact is traceable
  back to provider/model/agent/tenant.
- **Redact before you log.** Audit/log redaction uses the
  `SENSITIVE_KEYS`/pino `redact` sets (`./secret-handling.md` §6,
  `apps/api/CLAUDE.md` **#57, #66**). A new credential-bearing field MUST be added
  there too, or it leaks into audit detail.

## 5. Never render raw AI output as HTML

- `AGENTS.md` §7 and `apps/web/CLAUDE.md` **#43** are absolute: render AI output as
  markdown via a safe renderer or as plain text — **no `dangerouslySetInnerHTML`
  with AI content**. `react/no-danger` is **error** (`apps/web/CLAUDE.md` ESLint
  table); the codebase currently has zero `dangerouslySetInnerHTML` — keep it that way.
- Structured AI blocks (risk gauges, IoC tables, MITRE maps, timelines) use the
  standardized components in `apps/web/src/components/ai-renderer/` and
  `AiResultCard` (`apps/web/CLAUDE.md` **#53, #58**), which show provider/model and
  confidence. Never hand-roll ad-hoc rendering and never render raw inter-agent
  JSON to users (**#58**). Details: `../frontend/ai-ui-rules.md`.

## 6. Provider credentials are encrypted at rest; secrets never reach logs or responses

- AI connector configs (Bedrock AWS creds, LLM API keys, OpenClaw gateway keys)
  and custom OSINT source API keys are AES-256-GCM encrypted **before** the DB and
  only decrypted in-memory at use: `connectorsService.getDecryptedConfig(tenantId, type)`
  is the only read path (`ai.service.ts:854,884` via `resolveFixedConnectors`;
  `memory-extraction.service.ts:184`). Encryption uses
  `apps/api/src/common/utils/encryption.utility.ts` with `CONFIG_ENCRYPTION_KEY`
  (32 bytes / 64 hex) — see `./secret-handling.md` §5. **#95/#96** require OSINT
  source URLs to pass SSRF validation and OSINT API keys to be `encrypt()`-ed at rest.
- **Decrypted connector config must never appear in a response, a log, an audit
  detail, or a prompt.** It is passed as an opaque `Record<string, unknown>` into
  the adapter `invoke()` calls and discarded. Do not stringify it, log it, or echo
  it back. `getDecryptedConfig` returning `undefined` means "not configured" — fail
  closed, do not fall back to a hardcoded key (`apps/api/CLAUDE.md` **#24, #56**).
- AI endpoints stay behind the full guard chain and RBAC: the controllers use
  `@UseGuards(AuthGuard, TenantGuard)` + `@RequirePermission(Permission.AI_AGENTS_*)`
  - `@Throttle({ default: { limit: 10, ttl: 60000 } })`
    (`ai.controller.ts:16-19,28`; findings use `AI_AGENTS_VIEW`,
    `ai-writeback.controller.ts:25-39`). Every new AI endpoint MUST carry a
    permission + the AI rate-limit tier (`apps/api/CLAUDE.md` **#25, #33, #80**) and
    validate tenant ownership of any referenced entity before investigating it
    (**#48**; `loadAndValidateAlert` re-checks `tenantId`, `ai.service.ts:1410-1431`).

---

## Checklist before committing an AI-touching change

- [ ] Every free-text / raw-event field in the prompt is passed through
      `redact()` (`packages/ai/src/redaction.ts`) before the connector `invoke()`.
      `keep` is used only with a documented reason. No secret/PII reaches a provider.
- [ ] AI memory / transcript reads & mutations are scoped by `{ tenantId, userId }`
      (and `id` for single-record ops); ownership verified first. Memory content is
      redacted before embedding/storage. No secrets stored. Nothing in `localStorage`.
- [ ] Any side-effecting AI-proposed action is classified via
      `AiActionCategory` + `evaluateApproval()`; destructive/high-risk ones create
      an `ApprovalRequest` **before** execution and re-check `@RequirePermission`.
      No silent execution, no mock/env-gated provider path.
- [ ] Output carries `AiProvenance` (provider/model/confidence/citations); the call
      is audited (tenant, actor, provider, model, tokens, latency, outcome) and counts
      against agent quota + tenant budget. Secrets redacted from audit/logs.
- [ ] No `dangerouslySetInnerHTML` with AI content; structured output uses
      `ai-renderer/` + `AiResultCard`; no raw inter-agent JSON to users.
- [ ] Connector/OSINT credentials are AES-256-GCM at rest (`encrypt()` /
      `getDecryptedConfig`); decrypted config never logged, returned, or put in a
      prompt; no hardcoded/fallback keys. OSINT URLs SSRF-validated.
- [ ] AI endpoints behind `AuthGuard` + `TenantGuard` + `@RequirePermission` +
      AI `@Throttle` tier; referenced entities checked for tenant ownership.
- [ ] No `any`, no `eslint-disable`. `pnpm typecheck` passes (blocking gate;
      `tsgo`/`typecheck:fast` advisory). pnpm only, Node 22. **Branch first — never
      work on `main`.** Prove before deleting any file/dep/env var.

## Related

- `../../AGENTS.md` — §7 AI safety invariants, §6 tenant isolation + connector
  encryption, §8 branch safety.
- `../../apps/api/CLAUDE.md` — **#26** (tenant-scoped update/delete), **#48**
  (alert tenant ownership), **#88/#89** (provider cascade, no mock), **#95–#100**
  (OSINT SSRF/encryption, approval records, quota, trigger audit), **#56** (no
  `NODE_ENV` bypass), **#57/#66** (log/audit redaction).
- `../../apps/web/CLAUDE.md` — **#43** (no raw AI HTML), **#44/#58/#59** (action
  categories, no raw JSON, approval badges), **#46/#55** (no AI data in
  `localStorage`), **#30** (labeled rule-based fallback).
- `./secret-handling.md` — connector AES-256-GCM encryption (§5), log/audit
  redaction sets (§6).
- `../frontend/ai-ui-rules.md` — the UI side: provenance, dismissible panels, safe rendering.
- `../../skills/ai/add-ai-feature.md` — end-to-end recipe; `../../docs/AI.md` +
  `../../docs/ai/` — architecture & governance.
- `packages/ai/src/{redaction,safety,types,model-router}.ts` — the primitives this
  file governs.
