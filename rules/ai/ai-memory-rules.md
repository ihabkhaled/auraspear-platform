# Rules — AI Cross-Chat Memory (UserMemory)

> Read `../../AGENTS.md` first (loading order + the one rule: understand before
> you edit). Then `../../apps/api/CLAUDE.md` and `../../apps/web/CLAUDE.md`
> ("AI Cross-Chat Memory System", web CLAUDE.md L593–605). These are **hard
> constraints**, not guidance. AI memory makes the chat _remember the user across
> threads_ — it personalizes a security analyst's session, so it touches tenant
> data, PII, and the LLM system prompt at once. Get it wrong and you either leak
> cross-tenant data, persist a secret, or crash chat.

The whole subsystem lives in **`apps/api/src/modules/ai/memory/`**:

```
chat sends message ──▶ AiChatService.sendMessage()
   │ (before LLM call)        │ (after assistant reply)
   ▼                          ▼
MemoryRetrievalService     void dispatchMemoryExtraction()  ──enqueue──▶  Job(MEMORY_EXTRACTION)
.formatForPrompt()         (ai-chat.service.ts:341,403)                          │ async worker
   │ cosine sim, top-N                                                           ▼
   ▼                                              MemoryExtractionHandler → MemoryExtractionService
inject into systemPrompt                          .extractFromThread()  (LLM extract → embed → store)
```

Storage is the `UserMemory` Prisma model (`apps/api/prisma/schema.prisma:2607`,
table `user_memories`): `tenantId`, `userId`, `content`, `category`,
`embedding Float[]`, `sourceType`/`sourceId`/`sourceLabel`, `isDeleted`. Retention
config is `MemoryRetentionPolicy` (`schema.prisma:2633`).

## 1. Every memory row is tenant- AND user-scoped — on every read, write, delete

(AGENTS.md §6; CLAUDE.md #8, #26.) A `UserMemory` belongs to one `(tenantId,
userId)`. Treat that pair as inseparable — it is never "just userId".

- **Reads** filter `where: { tenantId, userId, isDeleted: false }`. See
  `MemoryRetrievalService.retrieveRelevant` (`memory-retrieval.service.ts:38`),
  `MemoryExtractionService.extractFromThread` existing-context load (`:43`),
  `UserMemoryService.listMemories` (`user-memory.service.ts:22`).
- **Bulk writes/deletes** carry both ids:
  `deleteAllMemories`/`adminDeleteUserMemories`/`cleanupExpiredMemories` all use
  `updateMany({ where: { tenantId, userId|—, ... } })` — never an `id`-only
  `where`. Follow this for any new bulk path.
- **Single-row `update`/`delete` must scope by `tenantId` in the `where`**
  (CLAUDE.md #26: every Prisma `update()`/`delete()` includes `tenantId`).
  Today `updateMemory`/`deleteMemory` call `verifyOwnership()` first
  (`user-memory.service.ts:281` — re-fetches and checks `memory.tenantId !==
tenantId || memory.userId !== userId`, throwing `errors.memory.accessDenied`)
  and then `update({ where: { id } })`. The ownership check is mandatory and
  must stay, but **new code must put `tenantId` in the `where` clause itself**
  (`where: { id, tenantId }`) — defense in depth, not a separate read. Do not
  add an `update`/`delete` that trusts a bare `id`.
- **Cross-user reads are admin-only.** `listAllMemories`, `getMemoryStats`,
  `exportMemories`, `adminDeleteUserMemories` (the `governance/*` endpoints) drop
  the `userId` filter but stay tenant-scoped and sit behind `AI_MEMORY_ADMIN` /
  `AI_MEMORY_EXPORT`. Raw `$queryRaw` in `getMemoryStats` still passes
  `tenant_id = ${tenantId}::uuid` — never build a memory query without it.

## 2. Extraction is async and fire-and-forget — it must never block or crash chat

The chat reply is returned to the analyst **before** extraction runs. Extraction
is an LLM round-trip; it does not belong on the request path.

- After persisting the assistant message, `AiChatService.sendMessage` calls
  `void this.dispatchMemoryExtraction(...)` (`ai-chat.service.ts:341`) — `void`-ed,
  never `await`-ed. `dispatchMemoryExtraction` (`:403`) only enqueues a
  `MEMORY_EXTRACTION` job (`repository.createJob`, `maxAttempts: 2`) inside a
  `try/catch` that swallows failures to `logger.warn`. The user's response never
  depends on it.
- The real work happens in the worker: `MemoryExtractionHandler.handle`
  (`apps/api/src/modules/jobs/handlers/memory-extraction.handler.ts`), registered
  against `JobType.MEMORY_EXTRACTION` in `jobs.module.ts:91`. Adding the job type
  without registering the handler leaves jobs PENDING forever (web CLAUDE.md #31).
- `extractFromThread` (`memory-extraction.service.ts:25`) wraps the LLM call in
  `try/catch` → `logger.error` and returns; a no-connector case
  (`resolveConfig` null) returns early with a warn. **Extraction failure is a
  no-op, never an exception that escapes the job.**
- **Never move extraction onto the synchronous chat path** "to make it instant".
  Enqueue it. Same fire-and-forget contract as the agent event listeners
  (`./ai-agent-rules.md` §4).

## 3. Retrieval ranks by embedding cosine similarity — with a recent-memories fallback

Before each LLM call, relevant memories are injected into the system prompt.

- `MemoryRetrievalService.retrieveRelevant` (`memory-retrieval.service.ts:18`)
  embeds the query (`EmbeddingService.generateEmbedding`), then scores every
  non-deleted memory by **cosine similarity** (`cosineSimilarity`, `:107`),
  keeps those `>= similarityThreshold` (`0.3`), sorts desc, takes `topN` (`10`).
- **Embeddings are produced by an llm_apis-capable connector** resolved per
  tenant (`embedding.service.ts:40`, fixed `llm_apis` → custom LLM connector).
  Model is auto-detected from the connector (Gemini `text-embedding-004` /
  OpenAI `text-embedding-ada-002`, per web CLAUDE.md L603). Never hardcode a
  single embedding provider — resolve it through the connector, consistent with
  the AI provider cascade (CLAUDE.md #88, #89).
- **Fallback is mandatory and non-fatal**: if embedding generation fails or
  returns `[]`, retrieval falls back to most-recent memories
  (`fallbackRecentMemories`, `:88`, `orderBy: updatedAt desc`). A memory whose
  stored `embedding.length === 0` simply scores `0` — it is skipped, not an error.
- Keep cosine math correct: equal-length vectors, zero-denominator guard returns
  `0` (`:122`). Do not swap in a different metric or drop the threshold/top-N
  bounds without updating `__tests__/memory-retrieval.service.spec.ts`.

## 4. Memory must NEVER store secrets or unredacted PII

(AGENTS.md §7; CLAUDE.md #24; `memory/AI_MEMORY.md`.) `content` is plain `Text`
that gets re-fed into an LLM system prompt and shown back to the user — it is a
disclosure surface.

- The extraction prompt (`buildExtractionPrompt`, `memory-extraction.service.ts:80`)
  is instructed to capture only "permanent, important facts (preferences,
  personal info, work context, explicit instructions)" — **never** credentials,
  tokens, API keys, connector configs, or one-off conversational data. Any change
  to that prompt must preserve the "no secrets" intent.
- Redact PII/secrets with `@auraspear/ai` `redact()` before content reaches a
  model or is persisted (AGENTS.md §7; `memory/AI_MEMORY.md`). Connector
  credentials are AES-256-GCM encrypted at rest and live in the connector tables
  — they do **not** belong in `user_memories`. Never copy a decrypted config into
  a memory row.
- No committed/fallback secrets anywhere in this path (AGENTS.md §6; CLAUDE.md
  #24). Embedding/LLM keys come from tenant connectors, not env defaults.

## 5. The user owns their memory — view, search, edit, delete, erase-all

Cross-chat memory is opt-out-able and fully inspectable by its owner. The HTTP
surface is `UserMemoryController` (`user-memory.controller.ts`, base
`user-memory`), guarded `AuthGuard, TenantGuard` + `@Throttle({ limit: 60, ttl:
60000 })`.

- **View/search**: `GET /user-memory` (category + `content` `contains` search,
  paginated) — `@RequirePermission(Permission.AI_MEMORY_VIEW)`.
- **Create/edit/delete**: `POST` / `PATCH :id` / `DELETE :id` and `DELETE`
  (erase-all) — `@RequirePermission(Permission.AI_MEMORY_EDIT)`. `AI_MEMORY_VIEW`
  and `AI_MEMORY_EDIT` are granted to **all roles** (web CLAUDE.md L604) — every
  analyst controls their own memory.
- **Deletes are soft** (`isDeleted: true`), consistent with the platform's
  soft-delete pattern; retrieval/extraction/listing all filter
  `isDeleted: false`. Do not hard-delete memory rows from app code.
- **User-edited memories are re-embedded**, not left stale: `createMemory`/
  `updateMemory` call `safeGenerateEmbedding` and set `sourceType: 'user_edit'`
  (`user-memory.service.ts:49,82`). `safeGenerateEmbedding` swallows embedding
  errors and saves with `[]` — editing memory never fails on a flaky embedding
  endpoint.
- **Governance ≠ self-service.** `governance/*` (admin list/stats/export/
  retention/cleanup/per-user erase) requires `AI_MEMORY_ADMIN` / `AI_MEMORY_EXPORT`,
  not `AI_MEMORY_EDIT`. Keep that split; never widen a governance endpoint to a
  self-service permission. Adding any new permission is end-to-end in one change
  (CLAUDE.md #85; web CLAUDE.md #34).

## 6. Surrounding invariants (don't regress these)

- **Frontend never renders raw memory as HTML** (AGENTS.md §7; web CLAUDE.md
  #43, #46). The Settings → AI Memory card (`apps/web/src/components/settings/
MemorySettingsCard.tsx`, `apps/web/src/hooks/useMemorySettings.ts`,
  `apps/web/src/services/memory.service.ts`) renders `content` as text/markdown.
  Never `dangerouslySetInnerHTML` it. Do not store AI/memory transcripts in
  `localStorage` (web CLAUDE.md #46).
- **Every backend memory endpoint has a Next.js proxy route** in
  `apps/web/src/app/api/` via `proxyToBackend()` (CLAUDE.md #86; web CLAUDE.md
  #33). A new memory endpoint without its proxy returns 404 HTML, not JSON.
- **Memory is part of RAG observability**: `RagObservabilityService` /
  `rag-observability.controller.ts` reuse `retrieveRelevant`. If you change
  retrieval scoring or scoping, update the observability path and
  `apps/web/src/hooks/useRagObservability.ts` too.
- **Backend code style**: no `any`, no `eslint-disable` (CLAUDE.md #1, #2);
  thin service → repository → Prisma layering; enums not string literals
  (CLAUDE.md #12); every method has an explicit return type (#67); `BusinessException`
  with a `messageKey` (#17) that exists in all 6 i18n files (#49). Note: the
  memory services currently read Prisma via a `getUserMemoryDelegate(this.prisma)`
  helper rather than a dedicated repository — match the existing pattern in this
  module; don't introduce a parallel data-access style.

## Checklist before you ship a memory change

- [ ] Every memory query/`update`/`delete` is scoped by `tenantId` (and `userId`
      for self-service); new single-row `update`/`delete` puts `tenantId` in the
      `where` clause, not only in a prior `verifyOwnership`.
- [ ] Extraction stays async (enqueued `MEMORY_EXTRACTION` job, `void`-ed, handler
      registered) and never throws into the chat path; retrieval is `try/catch`
      non-blocking — chat returns even if memory is fully down.
- [ ] Retrieval ranks by cosine similarity with the recent-memories fallback;
      threshold/top-N preserved; embedding provider resolved via connector, not
      hardcoded.
- [ ] No secret, credential, connector config, or unredacted PII can land in
      `content`; extraction prompt keeps its "no secrets" intent; `redact()` used
      before model/persist.
- [ ] User can view/search/edit/delete/erase-all under `AI_MEMORY_VIEW`/
      `AI_MEMORY_EDIT`; deletes are soft; edits re-embed; governance stays behind
      `AI_MEMORY_ADMIN`/`AI_MEMORY_EXPORT`.
- [ ] Memory `content` never rendered as raw HTML; no `localStorage` of
      transcripts; new endpoints have a Next.js proxy route + i18n keys in all 6
      locales.
- [ ] `pnpm typecheck` passes (blocking gate; `tsgo`/`typecheck:fast` advisory).
      No `any`, no `eslint-disable`. pnpm only, Node 22. Branch first — never work
      on `main`. Prove before deleting a memory field/service/handler/permission.

## Related

- `./ai-agent-rules.md` — agent dispatch/orchestration; same async fire-and-forget
  and tenant-scoping discipline.
- `./ai-governance.md` — AI safety/provenance/approval umbrella this fits under.
- `../backend/tenant-permission-rules.md` — tenant scoping + `@RequirePermission`
  every memory endpoint inherits.
- `../security/secret-handling.md` — AES-256-GCM secrets, no fallback secrets,
  redaction.
- `../frontend/ai-ui-rules.md` — rendering memory safely on the web side.
- `../../apps/api/CLAUDE.md` (#8, #24, #26, #85) · `../../apps/web/CLAUDE.md`
  ("AI Cross-Chat Memory System" L593–605, #43, #46) · `../../memory/AI_MEMORY.md`
  · `../../docs/ai/` + `docs/AI.md`.
