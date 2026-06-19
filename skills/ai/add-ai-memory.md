# Skill — Work with AI memory (`UserMemory`: extraction, retrieval, governance)

> **Read [`AGENTS.md`](../../AGENTS.md) first** (repo root): the loading order
> (§1), the security invariants (§6 — tenant isolation, RBAC, no auth/secret
> bypass), and **§7 AI safety** — _AI memory is tenant-scoped and **must not store
> secrets**; redact PII/secrets before model calls; never render raw AI output as
> HTML_. Then read the **authoritative hard rules** for this exact task:
> **[`rules/ai/ai-memory-rules.md`](../../rules/ai/ai-memory-rules.md)** (the
> six invariants + ship checklist — this skill is the _how_, that file is the
> _law_), plus
> [`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md),
> [`rules/ai/ai-output-rules.md`](../../rules/ai/ai-output-rules.md) (no raw
> HTML), and [`rules/security/`](../../rules/security/) (secret handling,
> tenant/permission). Then read **[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)**
> — the ABSOLUTE RULES that bite here: **#8/#26** (every query/`update`/`delete`
> scoped by `tenantId`), **#25** (`@RequirePermission` on every endpoint),
> **#24** (no fallback/hardcoded secrets), **#1/#2/#12/#13/#17/#67** (no `any`,
> no `eslint-disable`, enums not string literals, home files, explicit return
> types), **#71** (no `await` in loops for independent ops). And
> **[`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md)** — _"AI Cross-Chat Memory
> System"_ (L593–605), **#31** (every `JobType` has a registered handler), **#33**
> (new backend endpoint ⇒ Next.js proxy route), **#43/#46** (never render raw AI
> HTML, never `localStorage` transcripts).
>
> Sibling onboarding dirs: [`rules/`](../../rules/), [`skills/`](../) (you are
> here), [`memory/`](../../memory/)
> ([`AI_MEMORY.md`](../../memory/AI_MEMORY.md),
> [`SECURITY_MEMORY.md`](../../memory/SECURITY_MEMORY.md)),
> [`context/`](../../context/), [`docs/`](../../docs/)
> ([`docs/AI.md`](../../docs/AI.md)). Companion recipes:
> [`skills/ai/add-ai-feature.md`](add-ai-feature.md),
> [`skills/ai/add-ai-agent.md`](add-ai-agent.md),
> [`skills/backend/add-background-job.md`](../backend/add-background-job.md) (the
> async-job half), [`skills/backend/add-permission.md`](../backend/add-permission.md)
> (only if you add a new `AI_MEMORY_*` permission), and
> [`skills/frontend/add-ai-panel.md`](../frontend/add-ai-panel.md) (the UI half).
>
> **No AI agent may edit first and understand later.** AI memory makes chat
> _remember the analyst across threads_ — it touches tenant data, PII, the LLM
> system prompt, and an async job worker at once. Get it wrong and you leak
> cross-tenant data, persist a secret into a re-injected prompt, or crash chat.
> **Inspect the whole subsystem end-to-end before you touch it** — it already
> exists and works; copy its shape, do not reinvent it.

The entire subsystem lives in
**[`apps/api/src/modules/ai/memory/`](../../apps/api/src/modules/ai/memory/)**.
The data flow (verified, with file:line anchors):

```
chat sends message ─▶ AiChatService.sendMessage()  (ai-chat.service.ts)
   │ (BEFORE the LLM call, L228)        │ (AFTER the assistant reply persists, L341)
   ▼                                    ▼
MemoryRetrievalService.formatForPrompt  void this.dispatchMemoryExtraction(...)
   │ embed query → cosine sim → top-N      │ (L403) enqueues a Job, try/catch → warn
   │ try/catch → warn, NEVER throws        ▼
   ▼                                    Job(type='memory_extraction', maxAttempts:2)
inject into enhancedSystemPrompt (L235)    │ async worker (jobs processor)
                                           ▼
                          MemoryExtractionHandler.handle  (jobs/handlers/memory-extraction.handler.ts)
                          registered against JobType.MEMORY_EXTRACTION (jobs.module.ts:91)
                                           ▼
                          MemoryExtractionService.extractFromThread  (memory-extraction.service.ts:25)
                          LLM extract (try/catch → error, no throw) → embed → store
```

Storage is the **`UserMemory`** Prisma model
([`apps/api/prisma/schema.prisma:2607`](../../apps/api/prisma/schema.prisma),
table `user_memories`): `tenantId`, `userId`, `content` (`Text`), `category`
(`VarChar(50)`, default `'fact'`), `embedding Float[]`,
`sourceType`/`sourceId`/`sourceLabel`, `isDeleted`, timestamps. Indexed on
`(tenantId, userId)` and `(tenantId, userId, isDeleted)`. Retention config is
**`MemoryRetentionPolicy`** (`schema.prisma:2633`, unique per `tenantId`).

> ⚠️ **Data access is via a delegate helper, not a repository.** Until
> `prisma generate` lands the model on the client, the memory services read/write
> through `getUserMemoryDelegate(this.prisma)`
> ([`memory.types.ts:53`](../../apps/api/src/modules/ai/memory/memory.types.ts)).
> **Match the existing pattern in this module** — do not introduce a parallel
> data-access style or a `memory.repository.ts`
> ([`rules/ai/ai-memory-rules.md`](../../rules/ai/ai-memory-rules.md) §6). When the
> client is regenerated, the helper comment says to switch to `prisma.userMemory`
> directly — do that module-wide, not piecemeal.

---

## When to use

Use this skill when you need to **change how the chat assistant remembers users**:

- Tune **extraction** (what facts get captured, the extraction prompt, the
  category set, contradiction/update/delete logic) →
  [`memory-extraction.service.ts`](../../apps/api/src/modules/ai/memory/memory-extraction.service.ts).
- Tune **retrieval / RAG ranking** (cosine threshold, top-N, the recent-memories
  fallback, prompt-context formatting/token budget) →
  [`memory-retrieval.service.ts`](../../apps/api/src/modules/ai/memory/memory-retrieval.service.ts).
- Change **embeddings** (provider resolution, model auto-detection) →
  [`embedding.service.ts`](../../apps/api/src/modules/ai/memory/embedding.service.ts).
- Add/modify a **self-service** memory endpoint (view/search/create/edit/delete/
  erase-all) → [`user-memory.controller.ts`](../../apps/api/src/modules/ai/memory/user-memory.controller.ts)
  - [`user-memory.service.ts`](../../apps/api/src/modules/ai/memory/user-memory.service.ts).
- Add/modify a **governance** endpoint (admin list/stats/export/retention/
  cleanup/per-user erase) → same files, `governance/*` routes.
- Add a **new memory source** (extract memory from something other than a chat
  thread, e.g. a case note) → new `sourceType` + an enqueue point.

**Do not** use this skill for:

- A general **AI feature** (summarize/triage/score on a SOC module) →
  [`skills/ai/add-ai-feature.md`](add-ai-feature.md).
- A new **agent** or trigger mode → [`skills/ai/add-ai-agent.md`](add-ai-agent.md),
  [`rules/ai/ai-agent-rules.md`](../../rules/ai/ai-agent-rules.md).
- A **new background-job type** in general → first read
  [`skills/backend/add-background-job.md`](../backend/add-background-job.md)
  (the `JobType` enum + handler-registration contract this subsystem follows).
- The **Settings → AI Memory UI** → [`skills/frontend/add-ai-panel.md`](../frontend/add-ai-panel.md)
  (`MemorySettingsCard.tsx`, `useMemorySettings.ts`, `memory.service.ts`).
- A new **AI provider/connector** that produces embeddings → embeddings resolve
  through the existing connector cascade; do **not** hardcode a provider here.

---

## Files to inspect first (the whole subsystem — read before editing)

| Concern                              | File / symbol                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prisma model + retention             | [`apps/api/prisma/schema.prisma:2607`](../../apps/api/prisma/schema.prisma) (`UserMemory`, `MemoryRetentionPolicy`)                                                                                                                                                                                                                                                                                                                   |
| DI wiring                            | [`apps/api/src/modules/ai/memory/memory.module.ts`](../../apps/api/src/modules/ai/memory/memory.module.ts) (`MemoryModule` — controllers, providers, exports)                                                                                                                                                                                                                                                                         |
| Types + delegate helper              | [`memory.types.ts`](../../apps/api/src/modules/ai/memory/memory.types.ts) (`UserMemoryRecord`, `ExtractedMemory`, `RetrievedMemory`, `getUserMemoryDelegate`)                                                                                                                                                                                                                                                                         |
| **Retrieval / RAG**                  | [`memory-retrieval.service.ts`](../../apps/api/src/modules/ai/memory/memory-retrieval.service.ts) — `retrieveRelevant` (L18), `formatForPrompt` (L63), `fallbackRecentMemories` (L88), `cosineSimilarity` (L107); `topN=10`, `similarityThreshold=0.3`                                                                                                                                                                                |
| **Extraction (async)**               | [`memory-extraction.service.ts`](../../apps/api/src/modules/ai/memory/memory-extraction.service.ts) — `extractFromThread` (L25), `buildExtractionPrompt` (L80, the _no-secrets_ prompt), `parseExtractionResponse` (L107), `applyExtractedMemories` (L140), `resolveConfig` (L183)                                                                                                                                                    |
| **Embeddings**                       | [`embedding.service.ts`](../../apps/api/src/modules/ai/memory/embedding.service.ts) — `generateEmbedding` (L16), `resolveEmbeddingConfig` (L40, fixed `llm_apis` → custom LLM connector)                                                                                                                                                                                                                                              |
| **Self-service + governance HTTP**   | [`user-memory.controller.ts`](../../apps/api/src/modules/ai/memory/user-memory.controller.ts) (base `user-memory`, `AuthGuard,TenantGuard`, `@Throttle({limit:60,ttl:60000})`) + [`user-memory.service.ts`](../../apps/api/src/modules/ai/memory/user-memory.service.ts) (`verifyOwnership` L281, `safeGenerateEmbedding` L271)                                                                                                       |
| Async dispatch from chat             | [`ai-chat.service.ts`](../../apps/api/src/modules/ai/chat/ai-chat.service.ts) — retrieval inject L228–240, `void dispatchMemoryExtraction` L341, `dispatchMemoryExtraction` L403                                                                                                                                                                                                                                                      |
| Job type + handler                   | [`jobs/enums/job.enums.ts:19`](../../apps/api/src/modules/jobs/enums/job.enums.ts) (`MEMORY_EXTRACTION = 'memory_extraction'`), [`jobs/handlers/memory-extraction.handler.ts`](../../apps/api/src/modules/jobs/handlers/memory-extraction.handler.ts), registration [`jobs.module.ts:91`](../../apps/api/src/modules/jobs/jobs.module.ts)                                                                                             |
| Permissions                          | [`apps/api/src/common/enums/permission.enum.ts:224`](../../apps/api/src/common/enums/permission.enum.ts) (`AI_MEMORY_VIEW`, `AI_MEMORY_EDIT`, `AI_MEMORY_ADMIN`, `AI_MEMORY_EXPORT`) + [`role-settings/constants/permission-definitions.ts`](../../apps/api/src/modules/role-settings/constants/permission-definitions.ts) + [`default-permissions.ts`](../../apps/api/src/modules/role-settings/constants/default-permissions.ts)    |
| Redaction (the secret gate)          | [`packages/ai/src/redaction.ts:77`](../../packages/ai/src/redaction.ts) (`redact(input, keep)` → strips JWTs/AWS keys/bearer tokens/private keys/`key=secret`/emails/IPs)                                                                                                                                                                                                                                                             |
| RAG observability (reuses retrieval) | [`memory/rag-observability.service.ts`](../../apps/api/src/modules/ai/memory/rag-observability.service.ts), [`rag-observability.controller.ts`](../../apps/api/src/modules/ai/memory/rag-observability.controller.ts)                                                                                                                                                                                                                 |
| Existing tests                       | [`memory/__tests__/user-memory.service.spec.ts`](../../apps/api/src/modules/ai/memory/__tests__/user-memory.service.spec.ts), [`user-memory.controller.spec.ts`](../../apps/api/src/modules/ai/memory/__tests__/), [`apps/api/test/modules/user-memory-governance.spec.ts`](../../apps/api/test/modules/user-memory-governance.spec.ts)                                                                                               |
| Web side (proxy + service + UI)      | [`apps/web/src/app/api/user-memory/`](../../apps/web/src/app/api/user-memory/) (route.ts, `[id]`, `governance/*`), [`apps/web/src/services/memory.service.ts`](../../apps/web/src/services/memory.service.ts), [`apps/web/src/components/settings/MemorySettingsCard.tsx`](../../apps/web/src/components/settings/MemorySettingsCard.tsx), [`apps/web/src/hooks/useMemorySettings.ts`](../../apps/web/src/hooks/useMemorySettings.ts) |

---

## Exact step-by-step implementation

> Pick the recipe that matches your change. Every recipe ends at the same gates
> (Validation) and the same invariants (Security checks). `tenantId` + `userId`
> are inseparable for self-service memory; the pair is the scope.

### Step 0 — Branch first

`AGENTS.md §8`: never work on `main`/`master`.
`git checkout -b feat/ai-memory-<change>` (or `fix/...`).

### Recipe A — Tune retrieval / RAG ranking (non-blocking, cosine + fallback)

1. Edit `MemoryRetrievalService.retrieveRelevant`
   ([`memory-retrieval.service.ts:18`](../../apps/api/src/modules/ai/memory/memory-retrieval.service.ts)).
   It already: embeds the query via `EmbeddingService.generateEmbedding` inside a
   `try/catch` (warn, not throw), and **if the embedding is `[]` it falls back to
   `fallbackRecentMemories`** (L88, `orderBy updatedAt desc`). Keep both branches.
2. The Prisma read is **`where: { tenantId, userId, isDeleted: false }`** (L38) —
   never widen it. A memory whose stored `embedding.length === 0` scores `0` and
   is skipped (L48), not an error.
3. Scoring is **cosine similarity** (`cosineSimilarity`, L107): equal-length
   vectors, zero-denominator guard returns `0` (L122). If you change
   `topN` (10) or `similarityThreshold` (0.3), keep them as named class fields and
   update the retrieval spec. **Do not** swap to a different metric or drop the
   bounds without test coverage.
4. `formatForPrompt` (L63) enforces a token budget (`Math.ceil(line.length / 4)`)
   and returns `null` when nothing qualifies — `AiChatService` only prepends
   context when it is non-null (`ai-chat.service.ts:234`). Preserve the
   "return `null`, never throw" contract.
5. **Do not touch the chat call site to make retrieval blocking.** The injection
   at `ai-chat.service.ts:228` is wrapped in `try/catch` → `logger.warn` and chat
   proceeds with the un-enhanced prompt on failure. That non-blocking guarantee is
   a hard rule ([`ai-memory-rules.md`](../../rules/ai/ai-memory-rules.md) §2/§3).

### Recipe B — Tune extraction (async, fire-and-forget, no-secrets)

1. Extraction runs **only** in the worker. `AiChatService.sendMessage` does
   `void this.dispatchMemoryExtraction(...)` (`ai-chat.service.ts:341`) — `void`-ed,
   never `await`-ed — which enqueues a `memory_extraction` Job (`maxAttempts: 2`)
   inside a `try/catch` (L403). **Never move extraction onto the synchronous chat
   path.** If you add a new enqueue point, copy this fire-and-forget shape.
2. The handler `MemoryExtractionHandler.handle`
   ([`memory-extraction.handler.ts`](../../apps/api/src/modules/jobs/handlers/memory-extraction.handler.ts))
   reads `{ tenantId, userId, threadId }` from the job payload and calls
   `extractFromThread`. It is registered against `JobType.MEMORY_EXTRACTION` at
   [`jobs.module.ts:91`](../../apps/api/src/modules/jobs/jobs.module.ts) — **if you
   add a new `JobType`, you MUST register its handler** or jobs sit PENDING forever
   (`apps/web/CLAUDE.md` #31).
3. `extractFromThread` ([`memory-extraction.service.ts:25`](../../apps/api/src/modules/ai/memory/memory-extraction.service.ts))
   loads existing memories `where: { tenantId, userId, isDeleted: false }` for
   contradiction context, calls the LLM via `LlmApisService.invokeChat` inside a
   `try/catch` → `logger.error` (no throw), and on no-connector (`resolveConfig`
   null) returns early with a warn. **Extraction failure must stay a no-op.**
4. The extraction prompt `buildExtractionPrompt` (L80) is the secret gate: it is
   instructed to capture only _"permanent, important facts (preferences, personal
   info, work context, explicit instructions)"_ and to **emit create/update/delete
   actions** with categories `fact | preference | instruction | context`. Any edit
   **must preserve the "do NOT extract … no secrets" intent**. New categories must
   become an **enum** in a home file, not raw string literals (`apps/api/CLAUDE.md`
   #12/#13/#17).
5. `applyExtractedMemories` (L140) writes with `sourceType: 'chat_thread'`,
   `sourceId: threadId`. **A create embeds before storing**, an update re-embeds,
   a delete sets `isDeleted: true` (soft). Note it embeds inside a `for…of` loop —
   if you parallelize, respect `no-await-in-loop` (#71) only when the ops are
   truly independent.

### Recipe C — Embeddings (provider resolved via connector, never hardcoded)

1. `EmbeddingService.generateEmbedding` ([`embedding.service.ts:16`](../../apps/api/src/modules/ai/memory/embedding.service.ts))
   resolves a config via `resolveEmbeddingConfig` (L40): **fixed `llm_apis`
   connector first, then the first enabled custom LLM connector**; if none, it
   returns `[]` (logged warn) — callers treat `[]` as "no embedding", never an
   error. The model is auto-detected from the connector URL (Gemini
   `text-embedding-004` / OpenAI `text-embedding-ada-002`, per `apps/web/CLAUDE.md`
   L603). **Never hardcode a single embedding provider or an env-default key**
   (`apps/api/CLAUDE.md` #24, #88/#89) — resolve through the connector.
2. Embedding keys come from tenant connector configs (AES-256-GCM at rest), not
   `process.env`. Do not introduce a fallback secret.

### Recipe D — Self-service memory endpoint (view/search/edit/delete)

1. Add the route to `UserMemoryController`
   ([`user-memory.controller.ts`](../../apps/api/src/modules/ai/memory/user-memory.controller.ts)).
   Controllers only route and delegate (`apps/api/CLAUDE.md` #14). The controller
   already has `@UseGuards(AuthGuard, TenantGuard)` + `@Throttle({ limit: 60, ttl:
60000 })`. Add **`@RequirePermission(Permission.AI_MEMORY_VIEW)`** for reads,
   **`AI_MEMORY_EDIT`** for create/update/delete/erase-all (#25). Take `tenantId`
   from `@TenantId()` and `userId` from `@CurrentUser()` `user.sub` — **never from
   the body or a client header** (#76).
2. Implement in `UserMemoryService`
   ([`user-memory.service.ts`](../../apps/api/src/modules/ai/memory/user-memory.service.ts)).
   **Reads** filter `{ tenantId, userId, isDeleted: false }`. **Single-row
   `update`/`delete`** call `verifyOwnership(tenantId, userId, memoryId)` (L281,
   re-fetches and throws `errors.memory.accessDenied` on tenant/user mismatch) —
   keep that — **and new code must additionally put `tenantId` in the `where`
   clause** (`where: { id, tenantId }`) for defense in depth (`apps/api/CLAUDE.md`
   #26; [`ai-memory-rules.md`](../../rules/ai/ai-memory-rules.md) §1). **Bulk
   writes/deletes** use `updateMany({ where: { tenantId, userId, ... } })` —
   never an `id`-only `where`.
3. **Deletes are soft** (`isDeleted: true`) — `deleteMemory` (L87),
   `deleteAllMemories` (L98). Do not hard-delete from app code.
4. **Edits re-embed**: `createMemory`/`updateMemory` call `safeGenerateEmbedding`
   (L271, swallows embedding errors → saves `[]`) and set `sourceType:
'user_edit'`. Editing must never fail on a flaky embedding endpoint.
5. Throw `BusinessException(status, message, 'errors.memory.<key>')` (#17), not raw
   Nest exceptions; the `messageKey` must exist in **all** locale files (#49 — see
   Docs to update). Add a Next.js proxy route (Step below).

### Recipe E — Governance endpoint (admin, tenant-scoped, separate permission)

1. `governance/*` routes drop the `userId` filter but **stay tenant-scoped** and
   sit behind **`AI_MEMORY_ADMIN`** / **`AI_MEMORY_EXPORT`** — never
   `AI_MEMORY_EDIT`. Keep self-service vs governance permission split intact
   ([`ai-memory-rules.md`](../../rules/ai/ai-memory-rules.md) §5). See the existing
   `governance/stats|all|export|retention|cleanup|user/:userId` routes.
2. Raw SQL in `getMemoryStats` still parameterizes the tenant:
   `WHERE tenant_id = ${tenantId}::uuid` (`user-memory.service.ts:155`) — **never
   build a memory query without the tenant predicate**, raw or Prisma.
3. Retention lives in `MemoryRetentionPolicy` (unique per tenant);
   `cleanupExpiredMemories` (L228) soft-deletes rows older than `retentionDays`
   only when `autoCleanup` is on. If you add a scheduled cleanup, enqueue it as a
   job — same async discipline as extraction.

### Step — Adding a new `AI_MEMORY_*` permission (only if needed)

If a recipe needs a brand-new permission, do it **end-to-end in one change** via
[`skills/backend/add-permission.md`](../backend/add-permission.md)
(`apps/api/CLAUDE.md` #85): (1) `Permission` enum
([`permission.enum.ts`](../../apps/api/src/common/enums/permission.enum.ts)),
(2) [`permission-definitions.ts`](../../apps/api/src/modules/role-settings/constants/permission-definitions.ts)
with `labelKey` + `sortOrder`, (3)
[`default-permissions.ts`](../../apps/api/src/modules/role-settings/constants/default-permissions.ts)
for the right roles (the existing `AI_MEMORY_VIEW`/`AI_MEMORY_EDIT` are granted to
**all** roles — `apps/web/CLAUDE.md` L604), (4) `@RequirePermission()` on the
endpoint, (5) Prisma migration using the **`WHERE NOT EXISTS`** pattern (not
`ON CONFLICT ("key")` — the unique constraint is compound `(tenantId, key)`),
(6) frontend permission enum mirror, (7) Next.js proxy route, (8) i18n keys in all
locale files, (9) `pnpm prisma:seed`. Never ship a half-wired permission.

### Step — Next.js proxy route (every new backend endpoint)

A new `user-memory/...` backend endpoint needs a matching
`apps/web/src/app/api/user-memory/.../route.ts` via `proxyToBackend()`
(`apps/api/CLAUDE.md` #86; `apps/web/CLAUDE.md` #33) — mirror an existing one in
[`apps/web/src/app/api/user-memory/`](../../apps/web/src/app/api/user-memory/).
Without it the frontend gets 404 HTML instead of JSON. Then add the call to
[`apps/web/src/services/memory.service.ts`](../../apps/web/src/services/memory.service.ts).

### Step — RAG observability (if you changed retrieval scoring/scoping)

`RagObservabilityService` reuses `retrieveRelevant`. If you changed scoring or
scoping, update
[`rag-observability.service.ts`](../../apps/api/src/modules/ai/memory/rag-observability.service.ts)
and the web hook
[`apps/web/src/hooks/useRagObservability.ts`](../../apps/web/src/hooks/useRagObservability.ts)
([`ai-memory-rules.md`](../../rules/ai/ai-memory-rules.md) §6).

### Step — Tests

Extend the existing specs (do not start a parallel style):
[`memory/__tests__/user-memory.service.spec.ts`](../../apps/api/src/modules/ai/memory/__tests__/),
[`apps/api/test/modules/user-memory-governance.spec.ts`](../../apps/api/test/modules/user-memory-governance.spec.ts).
Cover: (a) reads/writes are `{ tenantId, userId }`-scoped and reject cross-tenant/
cross-user (`verifyOwnership` 403); (b) deletes are **soft**; (c) retrieval falls
back to recent memories when the embedding is `[]` and **never throws**;
(d) extraction is a no-op on LLM failure / no connector. On the web side,
[`apps/web/test/memory-service.test.ts`](../../apps/web/test/) /
`memory-hooks.test.ts` / `memory-permissions.test.ts` cover the client.

---

## Validation commands (real `pnpm` commands — run from repo root)

`pnpm` only, Node 22 (`AGENTS.md §4`). Run these and **read the output** — never
claim a gate is green without running it (`AGENTS.md §5/§13`):

```bash
pnpm install            # if deps changed
pnpm typecheck          # HARD gate — must pass (no any, enum exhaustiveness)
pnpm lint               # AI rules are ESLint errors: no-explicit-any, enum, no-console, no-await-in-loop
pnpm format:check       # Prettier (no semicolons, single quotes, width 100)
pnpm test               # unit tests — add/extend the memory specs
pnpm build              # HARD gate — must build
pnpm validate           # full bundle (typecheck + lint:strict + format:check)
```

Faster per-package iteration:

```bash
pnpm --filter @auraspear/api typecheck
pnpm --filter @auraspear/api lint:strict   # zero-warnings CI bar
pnpm --filter @auraspear/api test
pnpm --filter @auraspear/web test          # if you touched the web memory side
```

Run `pnpm prisma:generate` / `pnpm prisma:migrate` / `pnpm prisma:seed` **only**
if you changed `schema.prisma` (a new `UserMemory`/`MemoryRetentionPolicy` field
needs a migration — `apps/api/CLAUDE.md` #30) **or** added a permission (seed
populates it). The retrieval/extraction/embedding tuning recipes need **no** schema
change. **Hard gates that must be green:** `pnpm typecheck` and `pnpm build`
(`AGENTS.md §5`).

---

## Docs to update

- **[`memory/AI_MEMORY.md`](../../memory/AI_MEMORY.md)** — record the stable truth
  if you change a memory invariant (it already states _"AI memory (`UserMemory`)
  is tenant-scoped and must never store secrets; retrieval is non-blocking"_ —
  keep it accurate).
- **[`docs/AI.md`](../../docs/AI.md)** (and `docs/ai/` if present) — update the
  AI-memory description: extraction trigger, retrieval ranking, embedding model
  resolution, the permission set, any new endpoint.
- **[`rules/ai/ai-memory-rules.md`](../../rules/ai/ai-memory-rules.md)** — if you
  change an invariant (e.g. retrieval bounds, source types), update the rule + its
  ship checklist so the next agent isn't working from stale law.
- **i18n** — any new `errors.memory.<key>` (or other `messageKey`) must exist in
  **all** locale files (`apps/api/CLAUDE.md` #17/#49 and `apps/web/CLAUDE.md`).
  Locate the translation files in the repo (the API uses the `errors.<module>.<key>`
  convention; **verify the actual `i18n` path before claiming the keys are added** —
  do not assume the directory; grep for an existing `errors.` key).
- **[`docs/decisions/`](../../docs/decisions/)** (ADR) — only for a non-obvious
  change (a different similarity metric, a new retention policy, a new memory
  source type).
- `AGENTS.md §11` recipe table already lists AI skills; no edit needed.

---

## Security checks (the non-negotiable invariants — `AGENTS.md §6–§7`)

- [ ] **Tenant + user isolation (#8/#26).** Every memory **read** filters
      `{ tenantId, userId, isDeleted: false }`; every **bulk** `updateMany` carries
      both ids; every **single-row** `update`/`delete` keeps `verifyOwnership` **and**
      new code adds `tenantId` to the `where` clause. Governance reads stay
      tenant-scoped even when cross-user. Raw SQL parameterizes `tenant_id`.
      `tenantId` from `@TenantId()`, `userId` from `user.sub` — never body/header.
- [ ] **RBAC (#25).** Self-service routes carry `AI_MEMORY_VIEW`/`AI_MEMORY_EDIT`;
      governance routes carry `AI_MEMORY_ADMIN`/`AI_MEMORY_EXPORT`. Never widen a
      governance endpoint to a self-service permission. New permission ⇒ end-to-end
      (#85), never half-wired.
- [ ] **Never store secrets / unredacted PII in `content` (`AGENTS.md §7`; #24).**
      `content` is re-injected into a system prompt and shown back to the user — a
      disclosure surface. The extraction prompt keeps its _no-secrets_ intent;
      credentials/tokens/API keys/connector configs **never** land in
      `user_memories`. Use `redact()` from `@auraspear/ai`
      ([`packages/ai/src/redaction.ts`](../../packages/ai/src/redaction.ts)) before
      content reaches a model or persists. No fallback/env-default embedding or LLM
      secret — keys come from tenant connectors.
- [ ] **Non-blocking, async (`ai-memory-rules.md` §2/§3).** Retrieval injection is
      `try/catch` → warn and returns `null` on failure — **chat returns even if
      memory is fully down**. Extraction is enqueued (`void`-ed), the handler is
      registered (#31), and `extractFromThread` swallows failures to `logger.error`
      — **extraction never throws into the chat path**. Do not make either blocking.
- [ ] **Embedding fallback is mandatory and non-fatal.** Empty embedding ⇒ retrieval
      falls back to recent memories; a stored `embedding.length === 0` scores `0`
      and is skipped, not an error. Editing memory saves with `[]` on embed failure.
- [ ] **Soft delete only.** `isDeleted: true`; retrieval/extraction/listing all
      filter `isDeleted: false`. No hard delete from app code.
- [ ] **Never render raw memory as HTML; never `localStorage` transcripts**
      (`AGENTS.md §7`; `apps/web/CLAUDE.md` #43/#46). The Settings → AI Memory card
      renders `content` as text/markdown.
- [ ] **Every new backend endpoint has a Next.js proxy route** (#33/#86), and any
      new `messageKey` exists in all locale files (#49).
- [ ] Consider `/security-review` on the diff, plus
      [`skills/devsecops/run-security-scan.md`](../devsecops/run-security-scan.md) /
      `pnpm scan:secrets` before opening a PR.

---

## Common mistakes (each is an ESLint error, a type error, or a security bug)

- **Making retrieval or extraction block chat** — `await`-ing
  `dispatchMemoryExtraction`, or removing the `try/catch` around `formatForPrompt`.
  Memory must degrade silently; a memory outage must not crash chat.
- **Adding a `memory_extraction`-style `JobType` without registering the handler**
  → jobs sit PENDING forever (`apps/web/CLAUDE.md` #31). Register in
  `jobs.module.ts`.
- **`id`-only `where` on a memory `update`/`delete`**, or a read missing `userId`
  / `isDeleted: false` → cross-user/cross-tenant exposure or resurrected deleted
  rows (#26; §1).
- **Hardcoding an embedding provider/model or an env-default key** instead of
  resolving through the tenant connector (#24, #88/#89).
- **Weakening the extraction prompt's no-secrets intent**, or copying a decrypted
  connector config / token / API key into a memory row (`AGENTS.md §7`).
- **Hard-deleting memory** instead of `isDeleted: true`.
- **Widening a `governance/*` endpoint to `AI_MEMORY_EDIT`**, or dropping
  `tenant_id` from a raw stats query.
- **Introducing a `memory.repository.ts`** or a second data-access style instead
  of the module's `getUserMemoryDelegate(this.prisma)` pattern.
- **String literals for categories/source types/permissions** (`'fact'`,
  `'chat_thread'`, `'ai.memory.view'`) where an enum is required (#12/#13/#17).
- **A new backend endpoint without its Next.js proxy route** (#33) → 404 HTML.
- **`any`, `==`/`!=`, `!`, `console.log`, missing return type, `// eslint-disable`,
  `.util.ts`/`.utils.ts`** → all ESLint errors (#1, #2, #5, #6, #67).
- **A new `messageKey` added to only one locale file** (#49).
- **Claiming "green" without running `pnpm typecheck` / `pnpm build`**
  (`AGENTS.md §5/§13`).

---

## Final checklist

- [ ] Read `AGENTS.md` (§6, §7), **`rules/ai/ai-memory-rules.md`** (the six
      invariants + ship checklist), `apps/api/CLAUDE.md` (#8/#24/#25/#26),
      `apps/web/CLAUDE.md` ("AI Cross-Chat Memory System", #31/#33/#43/#46) before
      editing.
- [ ] Branch created (not `main`/`master`).
- [ ] Every memory query/`update`/`delete` scoped by `tenantId` (and `userId` for
      self-service); single-row mutations keep `verifyOwnership` **and** put
      `tenantId` in the `where`; bulk uses `updateMany` with both ids.
- [ ] Retrieval stays cosine + recent-fallback, `try/catch` → returns `null`,
      `topN`/`threshold` preserved or test-covered; injection at the chat call site
      remains non-blocking.
- [ ] Extraction stays async: `void`-ed dispatch, `memory_extraction` job, handler
      **registered** in `jobs.module.ts`, `extractFromThread` swallows failures —
      never throws into chat.
- [ ] Embeddings resolved via the tenant connector (fixed `llm_apis` → custom LLM),
      empty embedding handled as `[]`, **no hardcoded provider/secret**.
- [ ] No secret/credential/connector config/unredacted PII can reach `content`;
      extraction prompt keeps its no-secrets intent; `redact()` used before
      model/persist.
- [ ] Self-service guarded by `AI_MEMORY_VIEW`/`AI_MEMORY_EDIT`; governance by
      `AI_MEMORY_ADMIN`/`AI_MEMORY_EXPORT`; deletes soft; edits re-embed; new
      permission (if any) done end-to-end + `pnpm prisma:seed`.
- [ ] Memory `content` never rendered as raw HTML; no `localStorage` of transcripts;
      every new backend endpoint has its Next.js proxy route; new `messageKey`s in
      all locale files; RAG observability + web hook updated if scoring/scoping
      changed.
- [ ] Tests extended in the existing memory specs (tenant/user scope, soft delete,
      retrieval fallback, extraction no-op).
- [ ] Docs updated (`memory/AI_MEMORY.md`, `docs/AI.md`, and the rule if an
      invariant changed).
- [ ] Ran and pasted output for `pnpm typecheck` and `pnpm build` (hard gates) plus
      `pnpm lint` / `pnpm test`. Did **not** say "green" without evidence.
- [ ] Final response uses the `AGENTS.md §13` report format (Branch / Commits /
      Files created / Files updated / Commands run / Green checks / Failed checks /
      Blockers / Risks / Next steps).
