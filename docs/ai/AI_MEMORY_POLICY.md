# AI Memory Policy — Cross-Chat `UserMemory`

> **Start at [`AGENTS.md`](../../AGENTS.md)** (repo root) — the universal AI entry
> point: loading order, the one rule ("understand before you edit"), and the
> security/AI-safety invariants (§6, §7). This document is the **policy and
> reference** layer for AuraSpear's cross-chat AI memory. It explains _what the
> policy is and why_, grounded in the real code. It does **not** restate the
> enforceable rules or the implementation recipe — those live in their own files:
>
> - **Hard rules (the law):** [`rules/ai/ai-memory-rules.md`](../../rules/ai/ai-memory-rules.md)
>   — the six invariants + ship checklist. If this doc and the rules ever
>   disagree, the rules win.
> - **Implementation recipe (the how):** [`skills/ai/add-ai-memory.md`](../../skills/ai/add-ai-memory.md)
>   — step-by-step, with file:line anchors and validation gates.
> - **Stable truths:** [`memory/AI_MEMORY.md`](../../memory/AI_MEMORY.md).
> - **Per-app rules:** [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) (backend) ·
>   [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) ("AI Cross-Chat Memory System").
> - **Umbrella docs:** [`docs/AI.md`](../AI.md) · [`docs/SECURITY.md`](../SECURITY.md).

## What this is

Cross-chat memory makes the AI chat assistant **remember an analyst across
threads** — preferences, work context, and explicit instructions — so each new
conversation is personalized instead of starting from zero. Facts are extracted
asynchronously after a chat message, stored with vector embeddings, and the most
relevant ones are injected into the system prompt before the next LLM call.

Because the same `content` is both re-injected into an LLM prompt _and_ shown
back to the user, memory is simultaneously a **tenant-data surface**, a
**PII/secret-disclosure surface**, and a dependency on the **chat request path**.
That is why this policy exists.

The entire subsystem lives in
[`apps/api/src/modules/ai/memory/`](../../apps/api/src/modules/ai/memory/), wired
by [`memory.module.ts`](../../apps/api/src/modules/ai/memory/memory.module.ts).

## The five policy pillars

These five commitments are the headline of the policy. Each is enforced by the
hard rules and implemented in the cited code.

| Pillar                              | What it means                                                                                                          | Where it lives                                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Tenant-scoped (and user-scoped)** | Every memory row belongs to one `(tenantId, userId)` pair. No cross-tenant, no cross-user reads on self-service paths. | `where: { tenantId, userId, isDeleted: false }` throughout the module                                 |
| **Extraction → retrieval**          | Facts are _extracted_ from chat asynchronously, then _retrieved_ by semantic similarity and injected into the prompt.  | `memory-extraction.service.ts` · `memory-retrieval.service.ts`                                        |
| **No secrets**                      | Credentials, tokens, API keys, and connector configs must never land in a memory row.                                  | extraction prompt + `redact()` ([`packages/ai/src/redaction.ts`](../../packages/ai/src/redaction.ts)) |
| **Non-blocking**                    | A memory failure (retrieval or extraction) must never crash or slow chat.                                              | `try/catch` at the chat call site; `void`-ed async dispatch                                           |
| **User control**                    | The owner can view, search, edit, delete, and erase all of their memory.                                               | `UserMemoryController` self-service routes + Settings UI                                              |

## Data model

Storage is the `UserMemory` Prisma model
([`apps/api/prisma/schema.prisma:2607`](../../apps/api/prisma/schema.prisma), table
`user_memories`):

| Field                                     | Type                             | Notes                                                                     |
| ----------------------------------------- | -------------------------------- | ------------------------------------------------------------------------- |
| `tenantId`, `userId`                      | `Uuid`                           | The inseparable scope pair; both `onDelete: Cascade`.                     |
| `content`                                 | `Text`                           | The remembered fact — a disclosure surface (re-injected + shown back).    |
| `category`                                | `VarChar(50)`, default `'fact'`  | One of `fact` / `preference` / `instruction` / `context`.                 |
| `embedding`                               | `Float[]`                        | Vector for cosine retrieval; may be `[]` when embeddings are unavailable. |
| `sourceType` / `sourceId` / `sourceLabel` | `VarChar` / `Uuid?` / `VarChar?` | Provenance: `'chat_thread'` (extraction) or `'user_edit'` (manual).       |
| `isDeleted`                               | `Boolean`, default `false`       | Soft-delete flag; all reads filter `isDeleted: false`.                    |

Indexes are all `(tenantId, userId, …)` first — the schema itself encodes the
scoping rule. Retention is configured per tenant by `MemoryRetentionPolicy`
([`schema.prisma:2633`](../../apps/api/prisma/schema.prisma), `@@unique([tenantId])`,
`retentionDays` + `autoCleanup`).

> **Data-access note:** the module reads/writes through a
> `getUserMemoryDelegate(this.prisma)` helper
> ([`memory.types.ts`](../../apps/api/src/modules/ai/memory/memory.types.ts)), not a
> dedicated repository. Match that existing pattern; do not introduce a parallel
> data-access style (see the rules file §6).

## Lifecycle

```
chat message ─▶ AiChatService.sendMessage()  (ai-chat.service.ts)
   │ BEFORE the LLM call (L228)        │ AFTER the assistant reply persists (L341)
   ▼                                   ▼
MemoryRetrievalService.formatForPrompt void this.dispatchMemoryExtraction(...)
   │ embed query → cosine → top-N         │ (L403) enqueues a job, try/catch → warn
   │ try/catch → warn, NEVER throws       ▼
   ▼                                   Job(type = MEMORY_EXTRACTION, maxAttempts: 2)
inject into enhancedSystemPrompt (L235)   │ async worker (jobs processor)
                                          ▼
                       MemoryExtractionHandler.handle  (jobs/handlers/memory-extraction.handler.ts)
                       registered against JobType.MEMORY_EXTRACTION (jobs.module.ts)
                                          ▼
                       MemoryExtractionService.extractFromThread  (memory-extraction.service.ts:25)
                       LLM extract (try/catch → error, no throw) → embed → store
```

### Extraction (asynchronous, fire-and-forget)

After the assistant reply is persisted, `AiChatService.sendMessage` calls
`void this.dispatchMemoryExtraction(...)`
([`ai-chat.service.ts:341`](../../apps/api/src/modules/ai/chat/ai-chat.service.ts))
— `void`-ed, never `await`-ed. That only enqueues a `MEMORY_EXTRACTION` job; the
real LLM round-trip runs in the worker
([`memory-extraction.service.ts`](../../apps/api/src/modules/ai/memory/memory-extraction.service.ts)).
`extractFromThread` reads up to 50 of the user's own messages, loads existing
memories for contradiction context (`{ tenantId, userId, isDeleted: false }`),
asks the LLM for `create` / `update` / `delete` actions, then applies them with
`sourceType: 'chat_thread'`. The whole LLM path is wrapped in `try/catch →
logger.error`, and a missing connector returns early with a warn — **extraction
failure is a no-op, never an exception that escapes the job**.

### Retrieval (semantic, with a recent-memories fallback)

Before each LLM call, `MemoryRetrievalService.formatForPrompt` →
`retrieveRelevant`
([`memory-retrieval.service.ts`](../../apps/api/src/modules/ai/memory/memory-retrieval.service.ts))
embeds the query, scores every non-deleted memory by **cosine similarity**, keeps
those `>= 0.3` (`similarityThreshold`), sorts, and takes the top `10` (`topN`). If
embedding generation fails or returns `[]`, it **falls back to the most-recent
memories** (`fallbackRecentMemories`, `orderBy: updatedAt desc`); a memory whose
stored embedding is empty simply scores `0` and is skipped. `formatForPrompt`
applies a rough token budget and returns `null` when nothing qualifies, so the
chat call site only prepends context when it exists.

### Embeddings (provider resolved per tenant, never hardcoded)

`EmbeddingService.generateEmbedding`
([`embedding.service.ts`](../../apps/api/src/modules/ai/memory/embedding.service.ts))
resolves an embedding config per tenant — the fixed `llm_apis` connector first,
then the first enabled custom LLM connector — and returns `[]` (logged) when none
exists. The embedding model is auto-detected from the connector (Gemini
`text-embedding-004` / OpenAI `text-embedding-ada-002`, per
[`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md)). This mirrors the platform's AI
provider cascade: resolve through the tenant connector, never pin a single
provider or an env-default key.

## No secrets, no unredacted PII

`content` is re-fed into an LLM system prompt and rendered back to the user, so it
is a disclosure surface (AGENTS.md §7; `apps/api/CLAUDE.md` #24).

- The extraction prompt (`buildExtractionPrompt`,
  [`memory-extraction.service.ts:80`](../../apps/api/src/modules/ai/memory/memory-extraction.service.ts))
  is instructed to capture **only** permanent, important facts — preferences,
  personal info, work context, explicit instructions — and to skip temporary
  conversational details. Any change to that prompt must preserve this intent.
- Strip PII/secrets with `@auraspear/ai` `redact()`
  ([`packages/ai/src/redaction.ts`](../../packages/ai/src/redaction.ts), which
  removes JWTs, AWS keys, bearer tokens, private keys, `key=secret` pairs, emails,
  and IPs) before content reaches a model or is persisted.
- Connector credentials are AES-256-GCM encrypted in the connector tables — they
  **do not** belong in `user_memories`. Never copy a decrypted config into a
  memory row. Embedding/LLM keys come from tenant connectors, never env defaults
  (no fallback secrets — AGENTS.md §6).

## Non-blocking guarantee

Memory must degrade silently. The retrieval injection at
[`ai-chat.service.ts:227`](../../apps/api/src/modules/ai/chat/ai-chat.service.ts)
is wrapped in `try/catch → logger.warn`, and chat proceeds with the un-enhanced
prompt on failure. Extraction is enqueued and `void`-ed, its handler registered,
and `extractFromThread` swallows failures — **chat returns even if memory is fully
down.** Do not move extraction onto the synchronous path, and do not remove the
guard around retrieval.

## User control & governance

Memory is opt-out-able and fully inspectable by its owner. The HTTP surface is
[`UserMemoryController`](../../apps/api/src/modules/ai/memory/user-memory.controller.ts)
(base `user-memory`, `@UseGuards(AuthGuard, TenantGuard)`,
`@Throttle({ default: { limit: 60, ttl: 60000 } })`). `tenantId` comes from
`@TenantId()` and `userId` from the JWT (`user.sub`) — never from the body or a
client header.

| Surface                             | Routes                                                                                                                                              | Permission                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Self-service** (own memory)       | `GET /user-memory` (view/search), `POST`, `PATCH :id`, `DELETE :id`, `DELETE` (erase-all)                                                           | `AI_MEMORY_VIEW` (read) · `AI_MEMORY_EDIT` (write)   |
| **Governance** (tenant-wide, admin) | `governance/stats` · `governance/all` · `governance/export` · `governance/retention` (GET/PATCH) · `governance/cleanup` · `governance/user/:userId` | `AI_MEMORY_ADMIN` · `AI_MEMORY_EXPORT` (export only) |

Policy notes:

- **Permissions** are defined in
  [`permission.enum.ts:224`](../../apps/api/src/common/enums/permission.enum.ts)
  (`AI_MEMORY_VIEW`/`EDIT`/`ADMIN`/`EXPORT`). `AI_MEMORY_VIEW` and `AI_MEMORY_EDIT`
  are granted to **all roles** in
  [`default-permissions.ts`](../../apps/api/src/modules/role-settings/constants/default-permissions.ts)
  — every analyst controls their own memory.
- **Self-service vs governance is a hard split.** Governance reads drop the
  `userId` filter but stay tenant-scoped, and sit behind admin/export permissions.
  Never widen a governance endpoint to a self-service permission.
- **Deletes are soft** (`isDeleted: true`). Retrieval, extraction, and listing all
  filter `isDeleted: false`; deleted rows are never resurrected.
- **Edits re-embed.** Manual create/update set `sourceType: 'user_edit'` and
  re-generate the embedding (failures fall back to `[]` so editing never breaks on
  a flaky embedding endpoint).
- **Retention** is per-tenant (`MemoryRetentionPolicy`); `governance/cleanup`
  soft-deletes rows older than `retentionDays` only when `autoCleanup` is on.

### Web surface

The frontend Settings → AI Memory card lets users manage their own memory and
admins manage governance:
[`MemorySettingsCard.tsx`](../../apps/web/src/components/settings/MemorySettingsCard.tsx),
[`MemoryGovernanceTable.tsx`](../../apps/web/src/components/ai-memory/MemoryGovernanceTable.tsx),
hooks [`useMemorySettings.ts`](../../apps/web/src/hooks/useMemorySettings.ts) /
[`useAiMemoryGovernance.ts`](../../apps/web/src/hooks/useAiMemoryGovernance.ts),
and service [`memory.service.ts`](../../apps/web/src/services/memory.service.ts)
(which talks to the Next.js proxy routes under
`apps/web/src/app/api/user-memory/`). Memory `content` is rendered as text/markdown
— **never** as raw HTML — and transcripts are never stored in `localStorage`
(`apps/web/CLAUDE.md` #43, #46).

## Observability

Retrieval is reused by the RAG observability surface
([`rag-observability.service.ts`](../../apps/api/src/modules/ai/memory/rag-observability.service.ts),
[`rag-observability.controller.ts`](../../apps/api/src/modules/ai/memory/rag-observability.controller.ts),
web hook [`useRagObservability.ts`](../../apps/web/src/hooks/useRagObservability.ts))
so teams can inspect which memories were retrieved and why. Any change to
retrieval scoring or scoping must keep this path in sync.

## Quick reference (file map)

| Concern                          | File                                                                                                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Module wiring                    | [`memory.module.ts`](../../apps/api/src/modules/ai/memory/memory.module.ts)                                                                                                             |
| Types + delegate                 | [`memory.types.ts`](../../apps/api/src/modules/ai/memory/memory.types.ts)                                                                                                               |
| Extraction                       | [`memory-extraction.service.ts`](../../apps/api/src/modules/ai/memory/memory-extraction.service.ts)                                                                                     |
| Retrieval / RAG                  | [`memory-retrieval.service.ts`](../../apps/api/src/modules/ai/memory/memory-retrieval.service.ts)                                                                                       |
| Embeddings                       | [`embedding.service.ts`](../../apps/api/src/modules/ai/memory/embedding.service.ts)                                                                                                     |
| HTTP (self-service + governance) | [`user-memory.controller.ts`](../../apps/api/src/modules/ai/memory/user-memory.controller.ts) · [`user-memory.service.ts`](../../apps/api/src/modules/ai/memory/user-memory.service.ts) |
| Async dispatch from chat         | [`ai-chat.service.ts`](../../apps/api/src/modules/ai/chat/ai-chat.service.ts)                                                                                                           |
| Job handler                      | [`memory-extraction.handler.ts`](../../apps/api/src/modules/jobs/handlers/memory-extraction.handler.ts) · [`jobs.module.ts`](../../apps/api/src/modules/jobs/jobs.module.ts)            |
| Redaction (secret gate)          | [`packages/ai/src/redaction.ts`](../../packages/ai/src/redaction.ts)                                                                                                                    |
| Data model                       | [`schema.prisma:2607`](../../apps/api/prisma/schema.prisma) (`UserMemory`, `MemoryRetentionPolicy`)                                                                                     |

## Related

- [`rules/ai/ai-memory-rules.md`](../../rules/ai/ai-memory-rules.md) — the
  enforceable invariants + ship checklist (authoritative).
- [`skills/ai/add-ai-memory.md`](../../skills/ai/add-ai-memory.md) — how to change
  the subsystem safely, end-to-end.
- [`rules/ai/`](../../rules/ai/) (agent, governance, output rules) ·
  [`rules/security/`](../../rules/security/) (secret handling, tenant/permission).
- [`docs/AI.md`](../AI.md) — AI subsystem overview ·
  [`memory/AI_MEMORY.md`](../../memory/AI_MEMORY.md) — stable AI truths ·
  [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md) — full docs map.
