# Skill — Add / Configure an AI Agent (`apps/api` AI subsystem)

> **Read [`AGENTS.md`](../../AGENTS.md) first** (repo root): the loading order (§1),
> the **one rule** — understand before you edit (§0), tenant isolation + RBAC (§6),
> **AI safety (§7 — AI suggests, destructive actions are approval-required, never
> render raw AI output as HTML)**, validation gates (§5), and "never claim a gate
> green without running it" (§5/§13). Then the **hard rules** for this task:
> **[`rules/ai/ai-agent-rules.md`](../../rules/ai/ai-agent-rules.md)** (the authority —
> the orchestrator is the single chokepoint), [`rules/ai/ai-approval-rules.md`](../../rules/ai/ai-approval-rules.md),
> [`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md),
> [`rules/ai/ai-output-rules.md`](../../rules/ai/ai-output-rules.md),
> [`rules/backend/layering-rules.md`](../../rules/backend/layering-rules.md),
> [`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md),
> [`rules/backend/prisma-rules.md`](../../rules/backend/prisma-rules.md), and always-on
> [`rules/global/absolute-rules.md`](../../rules/global/absolute-rules.md),
> [`rules/global/branch-safety.md`](../../rules/global/branch-safety.md),
> [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md),
> [`rules/security/security-rules.md`](../../rules/security/security-rules.md). Then
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) — the "AI Agent Configuration Rules"
> **#92–#100** plus provider cascade **#88/#89**, AI rate-limit **#33**, and the ~100
> ESLint-enforced ABSOLUTE RULES **will block your commit**. Sibling onboarding:
> [`rules/`](../../rules/), [`skills/`](../) (you are here), [`memory/`](../../memory/)
> (`AI_MEMORY.md`, `SECURITY_MEMORY.md`, `TECHNICAL_MEMORY.md`), [`context/`](../../context/),
> [`docs/`](../../docs/) ([`docs/AI.md`](../../docs/AI.md)). Companion recipes:
> [`skills/backend/add-background-job.md`](../backend/add-background-job.md) (the
> `AI_AGENT_TASK` job already exists — extend, don't recreate),
> [`skills/backend/add-permission.md`](../backend/add-permission.md),
> [`skills/ai/add-ai-feature.md`](add-ai-feature.md), and the web side
> [`skills/frontend/add-ai-panel.md`](../frontend/add-ai-panel.md).
>
> **No AI agent may edit first and understand later.** Open the reference files in
> "Files to inspect first", copy the closest existing agent end-to-end, then adapt.
> Do not invent the dispatch pipeline — there is exactly one.

This recipe **adds a new AI agent** to the 28-agent roster (`AiAgentId`) or
**re-configures** an existing one (provider mode, trigger, quota, approval policy).
An "agent" is a **per-tenant configuration row** (`TenantAgentConfig`,
`apps/api/prisma/schema.prisma` L2275) keyed by an `AiAgentId` enum value, dispatched
through **one path** and executed by **one job type**:

```
caller (HTTP / event listener / scheduler)
   │
   ▼  OrchestratorService.dispatchAgentTask()      ── apps/api/src/modules/ai/orchestrator/orchestrator.service.ts:57
   │     1. resolveExecutionAgent(agentId)         (alias → core agent)
   │     2. agentConfigService.getAgentConfig(tenantId, agentId)
   │     3. canAgentExecute()  → enabled → mode → per-agent quota → tenant budget
   │     4. resolveAutomationMode() → requiresApproval?
   │     5. enqueueAgentJob(JobType.AI_AGENT_TASK, maxAttempts: 2)
   │     6. createApprovalRecord()  (if approval required — persisted BEFORE work runs)
   │     7. AppLoggerService dispatch log (SUCCESS / DENIED)
   ▼
JobService.enqueue(AI_AGENT_TASK)  ── async, Postgres-backed, Redis-locked poll loop
   ▼
AiAgentTaskHandler.handle(job)     ── apps/api/src/modules/ai-agents/ai-agent-task.handler.ts
   ▼  provider cascade: bedrock → llm_apis → openclaw_gateway → rule-based fallback
```

**The single most important fact: no caller talks to an AI provider directly and no
caller enqueues `AI_AGENT_TASK` itself. `OrchestratorService.dispatchAgentTask()` is
the only door** — it is where enabled/quota/budget/approval are enforced at once.
Bypass it and you bypass all four (`rules/ai/ai-agent-rules.md §1`).

> **Two repo-reality gaps you must know up front (the subsystem is mid-build):**
>
> 1. **`AiProviderMode` does not exist yet.** CLAUDE.md **#93** mandates that
>    `provider_mode` be validated against an `AiProviderMode` enum
>    (`direct_api | bedrock | openclaw | inherit`), but today
>    `apps/api/src/modules/agent-config/dto/update-agent-config.dto.ts` validates
>    `providerMode` as `z.string().trim().max(100)` and the column is a plain
>    `String @db.VarChar(100)` (schema L2280). The runtime today uses the
>    `AiConnectorPreference` enum (`default | bedrock | llm_apis | openclaw_gateway`,
>    `apps/api/src/common/enums/ai-connector-preference.enum.ts`) as the de-facto
>    provider key (`AI_DEFAULT_PROVIDER_KEY = 'default'`). If your task requires the
>    `AiProviderMode` contract, you must **create the enum and switch the Zod to
>    `z.nativeEnum(AiProviderMode)`** (Step 4) — do not leave `provider_mode` as a free
>    string.
> 2. **`trigger_config` is a single generic schema, not mode-specific.** CLAUDE.md
>    **#94** mandates that `trigger_config` JSON be validated by a **mode-specific** Zod
>    schema (no arbitrary JSON). Today it is one `z.record(z.unknown())` with a 64KB
>    `.refine()`. To satisfy #94 you must add a **per-`AiTriggerMode` discriminated
>    validation** (Step 5). Both gaps are the substance of this skill, not optional
>    polish.

---

## When to use

Use this skill when you need to:

- **Add a brand-new agent** to `AiAgentId` (a new specialist or core execution agent),
  with its default config, alias wiring, and per-tenant gating.
- **Add/change a provider mode** for an agent (which provider cascade it prefers) and
  enforce it via `AiProviderMode` (CLAUDE.md #93).
- **Add/change a trigger** (`manual_only | auto_on_alert | auto_by_agent | scheduled`)
  and validate its `trigger_config` with a **mode-specific** Zod schema (CLAUDE.md #94)
  — e.g. `minSeverities` for `auto_on_alert`, a cron-like window for `scheduled`.
- **Tune quota / approval policy** (per-agent token limits, governed/approval-required
  modes) for an agent.

**Do NOT use this skill for:**

- A **new AI feature surface** (an HTTP endpoint that returns an AI answer inline, e.g.
  "summarize this alert") → [`skills/ai/add-ai-feature.md`](add-ai-feature.md) +
  [`skills/backend/add-endpoint.md`](../backend/add-endpoint.md). Features map to agents
  via `FEATURE_TO_AGENT_MAP` (`agent-config.constants.ts`); they do not add agents.
- A **new job type** → the `AI_AGENT_TASK` job already exists and is registered
  (`apps/api/src/modules/jobs/jobs.module.ts:99`). Extend the **payload**, never add a
  second AI job type ([`skills/backend/add-background-job.md`](../backend/add-background-job.md)).
- A **new OSINT source** the agent enriches from → that is the OSINT-source CRUD on the
  same module (`createOsintSource` in `agent-config.service.ts`, SSRF + encryption
  rules below), not an agent.
- A **frontend agent card / config panel** → [`skills/frontend/add-ai-panel.md`](../frontend/add-ai-panel.md)
  and the agent/provider/trigger enum mirrors (web CLAUDE.md #50–#52, #56–#57).

---

## Files to inspect first (read before editing — copy the closest one)

| Concern                                                                                                        | Reference file                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The agent dispatch authority (hard rules)**                                                                  | [`rules/ai/ai-agent-rules.md`](../../rules/ai/ai-agent-rules.md)                                                                                                                                |
| `AiAgentId` (28), `AiTriggerMode`, `AiOutputFormat`, `ApprovalStatus`, `ApprovalRiskLevel`, `TokenResetPeriod` | `apps/api/src/common/enums/ai-agent-config.enum.ts`                                                                                                                                             |
| Provider key enum used at runtime today                                                                        | `apps/api/src/common/enums/ai-connector-preference.enum.ts`                                                                                                                                     |
| `AgentAutomationMode` / `AgentActionType` / `AgentRiskLevel`                                                   | `apps/api/src/common/enums/agent-automation-mode.enum.ts`, `agent-action-type.enum.ts`, `agent-risk-level.enum.ts`                                                                              |
| Enums barrel (export every new enum here)                                                                      | `apps/api/src/common/enums/index.ts`                                                                                                                                                            |
| **The single dispatch chokepoint**                                                                             | `apps/api/src/modules/ai/orchestrator/orchestrator.service.ts` (`dispatchAgentTask` L57, `canAgentExecute` L126, `resolveAutomationMode` L160, `requiresApproval` L179, `enqueueAgentJob` L290) |
| Approval / disabled / high-risk mode sets                                                                      | `apps/api/src/modules/ai/orchestrator/orchestrator.constants.ts`                                                                                                                                |
| Dispatch HTTP surface (RBAC + throttle)                                                                        | `apps/api/src/modules/ai/orchestrator/orchestrator.controller.ts` (`POST agent-config/agents/:agentId/dispatch`)                                                                                |
| Dispatch DTO (Zod)                                                                                             | `apps/api/src/modules/ai/orchestrator/dto/dispatch-task.dto.ts`                                                                                                                                 |
| **Agent defaults + alias map + resolver (add the new agent here)**                                             | `apps/api/src/modules/agent-config/agent-config.constants.ts` (`AI_AGENT_DEFAULTS` L7, `AGENT_ALIAS_MAP` L319, `resolveExecutionAgent` L349, `FEATURE_TO_AGENT_MAP` L281)                       |
| **Provider-mode + trigger-config Zod (edit here for #93/#94)**                                                 | `apps/api/src/modules/agent-config/dto/update-agent-config.dto.ts`                                                                                                                              |
| Agent-config service (validate id, update, quota reset, provider resolve, **createApproval**)                  | `apps/api/src/modules/agent-config/agent-config.service.ts`                                                                                                                                     |
| Agent-config utilities (`buildAgentConfigWithDefaults`, `isValidAgentId`, `buildTokenResetData`)               | `apps/api/src/modules/agent-config/agent-config.utilities.ts`                                                                                                                                   |
| Agent-config repository (pure Prisma, every method takes `tenantId`)                                           | `apps/api/src/modules/agent-config/agent-config.repository.ts`                                                                                                                                  |
| Per-agent quota check (CLAUDE.md #98)                                                                          | `apps/api/src/modules/ai/ai.utilities.ts` (`checkAgentQuota`)                                                                                                                                   |
| The `AI_AGENT_TASK` worker (extend payload, don't add a type)                                                  | `apps/api/src/modules/ai-agents/ai-agent-task.handler.ts`                                                                                                                                       |
| Handler registration (already wired — verify, don't duplicate)                                                 | `apps/api/src/modules/jobs/jobs.module.ts:99`                                                                                                                                                   |
| Event triggers (fire-and-forget, no-throw, `void`-ed)                                                          | `apps/api/src/modules/ai/orchestrator/agent-event-listener.service.ts`                                                                                                                          |
| Scheduled triggers (the only `@Cron` that touches AI)                                                          | `apps/api/src/modules/ai/orchestrator/agent-scheduler.service.ts`                                                                                                                               |
| Prisma models                                                                                                  | `apps/api/prisma/schema.prisma` — `model TenantAgentConfig` L2275, `model AiApprovalRequest` L2345                                                                                              |
| Migration patterns to mirror                                                                                   | `apps/api/prisma/migrations/20260322_add_agent_config_osint_approval/`, `…/20260325_backfill_agent_configs/`                                                                                    |
| AI permissions (already defined)                                                                               | `apps/api/src/common/enums/permission.enum.ts` (`AI_AGENTS_EXECUTE`, `AI_AGENTS_VIEW`, `AI_CONFIG_VIEW`, `AI_CONFIG_EDIT`, `AI_APPROVALS_MANAGE`, `AI_CONFIG_MANAGE_OSINT`)                     |

**Hard architecture facts (ESLint-enforced — apps/api/CLAUDE.md rules 12–14c, 17, 25–28, 67–73):**

- **`AI_AGENT_DEFAULTS` is `Record<AiAgentId, AgentDefaultConfig>`** — add a member to
  `AiAgentId` **without** adding its `AI_AGENT_DEFAULTS` entry and `tsc` fails (the
  blocking gate). This is your safety net; use it (`rules/ai/ai-agent-rules.md §2`).
- **Enums only, never string literals** (CLAUDE.md #92/#93/#94, #12). Agent ids,
  provider modes, trigger modes, action types, risk levels are `AiAgentId` /
  `AiProviderMode` / `AiTriggerMode` / `AgentActionType` / `AgentRiskLevel`. Note the
  `AiAgentId` values are **not uniform** — some use underscores (`l1_analyst`,
  `threat_hunter`), some hyphens (`alert-triage`, `incident-escalation`) — a hand-typed
  string _will_ drift and silently mis-route.
- **Controllers route only; services orchestrate (≤30 lines/method, complexity ≤10);
  repositories are pure Prisma and every method takes `tenantId`; types/enums/constants
  live in their dedicated files** (CLAUDE.md #13/#14/#14a–c). Validation is Zod via
  `ZodValidationPipe` — never class-validator, never `@Query()` with a DTO type.
- **Every `update()`/`delete()` scopes by `tenantId`** (CLAUDE.md #26). The
  `TenantAgentConfig` unique key is `@@unique([tenantId, agentId])` — upserts are by
  that compound key, never `agentId` alone.
- No `any`, no `!`, no `==`, no `console.log`, `node:` import prefix, explicit return
  types, kebab-case filenames, full word `utilities`/`utility` (never `utils`/`util`),
  no semicolons, single quotes, width 100 (Prettier).

---

## Exact step-by-step implementation

Run everything from repo root. **pnpm only, Node 22.** Replace `<AGENT_KEY>` (the enum
member, e.g. `PHISHING_TRIAGE`), `<agent-id>` (the enum string value, e.g.
`phishing-triage` — pick the hyphen/underscore style consistent with whether it is a
specialist alias or a core agent), and `<execution_agent>` (the core agent it delegates
to, e.g. `AiAgentId.L1_ANALYST`).

### 0. Branch (never work on `main`/`master` — AGENTS.md §8)

```bash
git checkout -b feat/ai-agent-<agent-id>
```

### 1. Decide: new agent, or reconfigure an existing one?

- **Reconfigure** (provider mode / trigger / quota / approval of an existing agent) →
  skip to Step 4 (provider mode), Step 5 (trigger), Step 6 (quota/approval). No enum or
  migration change is usually needed — `TenantAgentConfig` columns already exist.
- **New agent** → do Steps 2–3 first (enum + defaults + alias), then 4–8.

A new agent is **specialist** (appears as a UI card, delegates to a core executor via
`AGENT_ALIAS_MAP`) or **core** (has its own execution path). Most new agents are
specialists — pick the closest existing one in `AI_AGENT_DEFAULTS` and copy it.

### 2. Add the agent to `AiAgentId` + `AI_AGENT_DEFAULTS` + `AGENT_ALIAS_MAP`

**(a)** `apps/api/src/common/enums/ai-agent-config.enum.ts` — add the member:

```ts
export enum AiAgentId {
  // … existing 28 members …
  PHISHING_TRIAGE = 'phishing-triage',
}
```

**(b)** `apps/api/src/modules/agent-config/agent-config.constants.ts` — add the
`AI_AGENT_DEFAULTS` entry (omitting it fails `tsc`). Copy the shape of the closest agent
(e.g. `ALERT_TRIAGE`, L72):

```ts
[AiAgentId.PHISHING_TRIAGE]: {
  displayName: 'Phishing Triage Agent',
  description: 'Triage suspected phishing alerts and score sender reputation',
  temperature: 0.4,
  maxTokensPerCall: 2048,
  triggerMode: AiTriggerMode.AUTO_ON_ALERT,        // enum, never 'auto_on_alert'
  outputFormat: AiOutputFormat.RICH_CARDS,         // enum
  presentationSkills: ['risk_gauge', 'ioc_table'],
},
```

**(c)** If the agent is a **specialist** that delegates, wire `AGENT_ALIAS_MAP` (L319) so
`resolveExecutionAgent()` (L349) routes it to a real executor:

```ts
[AiAgentId.PHISHING_TRIAGE]: AiAgentId.L1_ANALYST,
```

> `AGENT_DEFAULTS_MAP` and `getAgentConfigs()` iterate `Object.values(AiAgentId)`, so the
> new agent automatically appears (disabled by default) for every tenant via
> `buildAgentConfigWithDefaults()` — no per-tenant insert needed at add time.
> `isValidAgentId()` (`agent-config.utilities.ts:120`) also picks it up.

### 3. Persist / seed defaults (Prisma + migration if you change columns or seed rows)

The `TenantAgentConfig` table already has every column you need (provider mode, trigger,
quota, etc.) — adding an `AiAgentId` value alone needs **no migration** (it's a string
column, not a DB enum). You need a migration only when you:

- **Add a column** (e.g. a new quota field) → `prisma/schema.prisma` + a migration
  (CLAUDE.md #30), generate the SQL with
  `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`
  (run inside `apps/api`), then create
  `prisma/migrations/$(date +%Y%m%d)_<desc>/migration.sql`.
- **Seed default rows** for the new agent across existing tenants → mirror
  `prisma/migrations/20260325_backfill_agent_configs/` and keep the seed in
  `apps/api/prisma/seed.ts` **idempotent** (`upsert` / `WHERE NOT EXISTS`, CLAUDE.md #15).
  Note rows are also **lazily created** by `upsertAgentConfig` on first toggle/update, so
  a backfill is optional unless you need them enabled out of the box.

### 4. Provider mode — validate against `AiProviderMode` (CLAUDE.md #93)

Today `providerMode` is a free string (see the gap note above). To satisfy #93:

**(a)** Create `apps/api/src/common/enums/ai-provider-mode.enum.ts`:

```ts
export enum AiProviderMode {
  DIRECT_API = 'direct_api',
  BEDROCK = 'bedrock',
  OPENCLAW = 'openclaw',
  INHERIT = 'inherit',
}
```

Export it from `apps/api/src/common/enums/index.ts`.

**(b)** Switch the DTO in
`apps/api/src/modules/agent-config/dto/update-agent-config.dto.ts` from
`z.string().trim().max(100)` to the enum:

```ts
providerMode: z.nativeEnum(AiProviderMode).optional(),
```

**(c)** If you replace the legacy `'default'`/`AiConnectorPreference` key, reconcile
`resolveProviderForAgent()` (`agent-config.service.ts:160`) and
`AI_DEFAULT_PROVIDER_KEY` so existing rows (stored as `'default'`) still resolve — map
`'default'`/`INHERIT` to the tenant connector cascade. **Never hardcode a single
provider** and **never short-circuit the cascade** (CLAUDE.md #88/#89; the handler must
still try `bedrock → llm_apis → openclaw_gateway` before rule-based fallback).

> If your task does not require the enum migration, at minimum keep `provider_mode`
> constrained and documented — but a free-string `provider_mode` is a standing #93
> violation; flag it in your final report rather than silently leaving it.

### 5. Trigger — `triggerMode` enum + **mode-specific** `trigger_config` Zod (CLAUDE.md #94)

`triggerMode` is already `z.nativeEnum(AiTriggerMode)` in the DTO — good. The gap is
`trigger_config`: today it is one generic `z.record(z.unknown())` with a 64KB `.refine()`.
CLAUDE.md **#94** requires the config be validated by a **schema chosen per trigger mode**.
Add a discriminated validator (keep schemas in a `*.types.ts`/dto file, not inline — #13):

```ts
// dto/update-agent-config.dto.ts (or a dedicated trigger-config schema file)
const ManualTriggerConfigSchema = z.object({}).strict()

const AutoOnAlertTriggerConfigSchema = z
  .object({
    minSeverities: z.array(z.nativeEnum(AlertSeverity)).max(5).optional(),
    sourceConnectors: z.array(z.string().max(100)).max(20).optional(),
  })
  .strict()

const AutoByAgentTriggerConfigSchema = z
  .object({ invokedBy: z.array(z.nativeEnum(AiAgentId)).max(28).optional() })
  .strict()

const ScheduledTriggerConfigSchema = z
  .object({
    cron: z.string().max(120), // validated by AgentSchedulerService
    onStatuses: z.array(z.string().max(50)).max(20).optional(),
  })
  .strict()
```

Then validate `triggerConfig` **against the schema matching `triggerMode`** using a
`.superRefine()` on the object (so the chosen schema depends on the sibling field), keeping
the existing **64KB cap** (CLAUDE.md #78 — JSON fields must be size-bounded) and
**`.max()` on every string/array** (CLAUDE.md #27/#28):

```ts
export const UpdateAgentConfigSchema = z
  .object({
    /* … existing fields …, providerMode (Step 4), triggerMode (enum) … */
    triggerConfig: z.record(z.unknown()).optional(),
  })
  .superRefine((dto, ctx) => {
    if (!dto.triggerConfig) return
    if (JSON.stringify(dto.triggerConfig).length > 65536) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'triggerConfig exceeds 64KB limit' })
      return
    }
    const schemaByMode = {
      [AiTriggerMode.MANUAL_ONLY]: ManualTriggerConfigSchema,
      [AiTriggerMode.AUTO_ON_ALERT]: AutoOnAlertTriggerConfigSchema,
      [AiTriggerMode.AUTO_BY_AGENT]: AutoByAgentTriggerConfigSchema,
      [AiTriggerMode.SCHEDULED]: ScheduledTriggerConfigSchema,
    }
    const mode = dto.triggerMode ?? AiTriggerMode.MANUAL_ONLY
    const result = Reflect.get(schemaByMode, mode).safeParse(dto.triggerConfig)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'errors.agentConfig.invalidTriggerConfig',
      })
    }
  })
```

The matching **event listener** (`auto_on_alert` / `auto_by_agent`) reads this config and
filters before dispatch (e.g. `minSeverities`); the **scheduler** (`scheduled`) reads
`cron`. Keep the listener contract (Step 7) and never let it throw.

### 6. Quota & approval policy (CLAUDE.md #97/#98 — already enforced by the orchestrator)

These are **enforced at dispatch**; you only set the policy, never re-implement the check:

- **Per-agent token quota** — set `tokensPerHour/Day/Month` and `maxConcurrentRuns` via
  `PATCH agent-config/agents/:agentId` (`UpdateAgentConfigSchema`); the orchestrator calls
  `checkAgentQuota(config)` (`ai.utilities.ts`) inside `canAgentExecute()` and returns
  `403 errors.orchestrator.quotaExceeded` when exceeded (CLAUDE.md #98). Reset counters via
  `POST agent-config/agents/:agentId/reset-usage/:period` (`buildTokenResetData`).
- **Approval policy** — the automation mode derived from `triggerMode`
  (`mapTriggerModeToAutomationMode`) plus `APPROVAL_REQUIRED_MODES`
  (`approval_required`, `auto_governed`) and `auto_low_risk` + `HIGH_RISK_LEVELS` drive
  `requiresApproval()` (`orchestrator.service.ts:179`). When `true`,
  `dispatchAgentTask()` persists an **`AiApprovalRequest` before the job can run**
  (`createApprovalRecord` → `agentConfigService.createApproval`, 24h expiry,
  `ApprovalStatus.PENDING`). **Never add a code path that runs a destructive/governed
  action without that persisted record** (CLAUDE.md #97; AGENTS.md §7;
  `rules/ai/ai-approval-rules.md`).

### 7. Wire triggers (only if the agent runs automatically)

The agent task is **always async** — triggers only **validate + enqueue via the
orchestrator**, never call a provider (`rules/ai/ai-agent-rules.md §3`):

- **`auto_on_alert` / `auto_by_agent` (event-driven)** — add/extend a method on
  `AgentEventListenerService`
  (`apps/api/src/modules/ai/orchestrator/agent-event-listener.service.ts`). It must:
  load config, check `isEnabled` + `triggerMode` + the `triggerConfig` filter, then
  `await orchestratorService.dispatchAgentTask(...)`, all wrapped in `try/catch` that
  **swallows** the error via `this.log.error(...)` (CLAUDE.md/§4 — an AI trigger must
  never break the business flow that fired it). At the call site, invoke it **`void`-ed
  and never `await`-ed**, treating the listener as optional (injected via `forwardRef`,
  may be `null`):

  ```ts
  if (!this.agentEventListener) return
  void this.agentEventListener.onAlertCreated(tenantId, alert.id)
  ```

- **`scheduled`** — do **not** add a new `@Cron`. The **only** AI cron is
  `AgentSchedulerService.processDueSchedules()` (`*/30 * * * * *`); it reads due rows and
  calls `dispatchAgentTask(...)`. Add your schedule as data (an `ai_agent_schedules` row),
  not a new cron (`rules/ai/ai-agent-rules.md §3`).

- **`manual_only`** — dispatched only via the HTTP surface
  (`POST agent-config/agents/:agentId/dispatch`, already guarded by
  `@RequirePermission(Permission.AI_AGENTS_EXECUTE)` + `@Throttle({ limit: 10, ttl: 60000 })`).
  No new code unless you add a new dispatch action type.

### 8. Permissions, proxy, i18n (only if you add a NEW endpoint or permission)

- The existing agent-config + orchestrator endpoints already carry the right
  `@RequirePermission` (`AI_CONFIG_VIEW/EDIT`, `AI_AGENTS_VIEW/EXECUTE`,
  `AI_APPROVALS_MANAGE`) and throttle tiers — **reuse them**.
- If you add a **brand-new endpoint** the frontend calls, you must add a Next.js proxy
  route (CLAUDE.md #86) and, if a **new permission**, do the full end-to-end permission
  change in one commit (CLAUDE.md #85) — follow
  [`skills/backend/add-permission.md`](../backend/add-permission.md).
- Any **new error `messageKey`** (e.g. `errors.agentConfig.invalidTriggerConfig`) must be
  added to **all 6** i18n locale files (CLAUDE.md #49): `en/ar/es/fr/de/it.json`.

### 9. Extend the worker payload (only if the new agent needs new inputs)

The `AI_AGENT_TASK` handler is registered (`jobs.module.ts:99`) — **do not add a job
type**. If the agent needs extra inputs, extend `AgentTaskPayload`
(`apps/api/src/modules/ai-agents/ai-agents.types.ts`) and read it defensively in
`AiAgentTaskHandler.handle()`, always scoping by `job.tenantId`. **No secrets in the
payload** (it is persisted + logged — CLAUDE.md #24; pass an id, fetch/decrypt in the
handler). The handler must keep the provider cascade and **never render or emit raw AI
HTML** (AGENTS.md §7).

---

## Validation commands (real `pnpm` commands, from repo root)

Run in order and **read the output — never claim a gate green without running it**
(AGENTS.md §5/§13; [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md)):

```bash
pnpm install                                   # if deps changed
pnpm --filter @auraspear/api prisma:generate   # regenerate client (only if schema changed)
pnpm typecheck                                 # HARD GATE — proves AI_AGENT_DEFAULTS covers the new AiAgentId
pnpm --filter @auraspear/api lint:strict       # ESLint --max-warnings 0 — enforces #1–#100 (no string-literal enums, no any)
pnpm --filter @auraspear/api format:check      # Prettier (no semicolons, single quotes, width 100)
pnpm --filter @auraspear/api test              # jest — add specs (see below)
pnpm build                                     # HARD GATE — nest build
```

If you changed Prisma (new column / seed):

```bash
pnpm --filter @auraspear/api prisma:migrate    # apply the migration (dev)
pnpm --filter @auraspear/api exec prisma db seed   # if you seeded default rows (idempotent — CLAUDE.md #15)
```

Iterate on just this area:

```bash
pnpm --filter @auraspear/api exec jest src/modules/agent-config src/modules/ai/orchestrator
```

Full pre-PR sweep:

```bash
pnpm validate                                  # turbo: typecheck + lint:strict + format:check
```

Tests to add (services tested via spec; CLAUDE.md "Testing"): assert
`canAgentExecute()` returns the right `messageKey` for disabled / quota / budget; assert
`requiresApproval()` is `true` for `approval_required`/`auto_governed` and for
`auto_low_risk` at `medium`+ risk; assert the **mode-specific** `triggerConfig` schema
rejects a bad config and accepts a good one; assert `dispatchAgentTask()` enqueues
`JobType.AI_AGENT_TASK` and persists an approval when required.

> **Hard gates that must be green: `pnpm typecheck` and `pnpm build`.** `lint:strict` /
> `format:check` / `test` are advisory-but-expected (tracked debt is non-blocking — but
> run them and report results). See AGENTS.md §5.

Manual smoke (optional): `pnpm dev:api`, `PATCH agent-config/agents/<agent-id>` to enable

- set provider/trigger, then `POST agent-config/agents/<agent-id>/dispatch`; watch the
  structured logs for the `OrchestratorService` dispatch line (`SUCCESS`/`DENIED`) and the
  `AiAgentTaskHandler` `Job started`/`Job completed`. A `DENIED` log with a `messageKey`
  means a gate (enabled/quota/budget) blocked it — that is correct behavior.

---

## Docs to update

- [`docs/AI.md`](../../docs/AI.md) and [`docs/ai/`](../../docs/ai/) — add the new agent
  (id, role, default trigger, provider mode, approval policy) to the agent roster; if you
  added `AiProviderMode` or mode-specific trigger validation, document the contract.
- [`memory/AI_MEMORY.md`](../../memory/AI_MEMORY.md) — record the new `AiAgentId` value,
  the `AI_AGENT_DEFAULTS`/`AGENT_ALIAS_MAP` wiring, and the dispatch chokepoint so the
  next agent knows the one-door rule.
- [`memory/TECHNICAL_MEMORY.md`](../../memory/TECHNICAL_MEMORY.md) — note the
  `Record<AiAgentId, …>` `tsc` safety net and the trigger-config schema location.
- A notable decision (new `AiProviderMode` enum, new approval policy, new trigger type)
  → an ADR under [`docs/decisions/`](../../docs/decisions/) and
  [`memory/DECISIONS_MEMORY.md`](../../memory/DECISIONS_MEMORY.md).
- Cross-check [`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md). If you added an endpoint,
  also [`docs/API.md`](../../docs/API.md) + the web proxy route.

---

## Security checks (must hold — AGENTS.md §6/§7; CLAUDE.md #24/#26/#33/#88/#89/#92–#100)

- [ ] **One door only.** Every dispatch goes through
      `OrchestratorService.dispatchAgentTask()`; no caller enqueues `AI_AGENT_TASK` or
      calls an AI provider directly (`rules/ai/ai-agent-rules.md §1`).
- [ ] **`canAgentExecute` chain intact** — enabled → automation mode (not disabled) →
      per-agent token quota (#98) → tenant monthly budget — and **every dispatch and every
      block is logged** with `tenantId`, `agentId`, `actionType` (#99). Do not short-circuit.
- [ ] **Destructive / governed = approval-required.** `requiresApproval()` resolves
      correctly and a persisted **`AiApprovalRequest`** exists **before** any execution
      (#97; AGENTS.md §7). The handler honors approval state. No persisted approval ⇒ no
      execution.
- [ ] **Enums only** — `AiAgentId` / `AiProviderMode` / `AiTriggerMode` / `AgentActionType`
      / `AgentRiskLevel`; no string literals (#92–#94, #12). New agent added to the enum
      **and** `AI_AGENT_DEFAULTS` (the `tsc` gate proves it).
- [ ] **`trigger_config` is mode-specific** Zod, size-capped (64KB, #78), every string/array
      `.max()`-bounded (#27/#28); no arbitrary JSON (#94).
- [ ] **Provider cascade preserved** — no single hardcoded provider, no `BEDROCK_MOCK`/
      env-gated mock path; cascade is `bedrock → llm_apis → openclaw_gateway` → rule-based
      only when none configured/all fail (#88/#89).
- [ ] **Tenant isolation** — `tenantId` on the input, job payload, approval, and every log;
      config + quota are per-tenant; `update()`/upsert scope by `[tenantId, agentId]` (#26).
      Never read tenant from free-text payload and trust it.
- [ ] **RBAC + rate limit on the HTTP surface** — dispatch keeps
      `@RequirePermission(Permission.AI_AGENTS_EXECUTE)` + `@Throttle({ limit: 10, ttl: 60000 })`
      (AI tier, #33); config edits keep `AI_CONFIG_EDIT`; tenant from `@TenantId()` /
      validated JWT, never a client header (#76). No auth/permission bypass by `NODE_ENV` (#56).
- [ ] **Secrets** — no committed/fallback secrets; OSINT source API keys are AES-256-GCM
      encrypted at rest (`EncryptionUtility.encrypt`) and their URLs pass
      `SsrfUtility.validateUrl()` before storage (#95/#96); no secrets in agent config,
      job payload, approval `actionData`, or logs (#24).
- [ ] **Never render raw AI output as HTML** anywhere in this flow (AGENTS.md §7).
- [ ] Errors stay generic / no internal paths (#44/#63/#77); event listeners never throw
      into the business path (§4).
- [ ] Touching auth/RBAC/data exposure or a new provider path? Run
      [`skills/devsecops/run-security-scan.md`](../devsecops/run-security-scan.md) and
      consider `/security-review` on the diff.

---

## Common mistakes

- **Dispatching outside the orchestrator** — enqueuing `AI_AGENT_TASK` directly or calling
  `AiService`/a provider from a listener, scheduler, or controller. Bypasses
  enabled/quota/budget/approval at once (`rules/ai/ai-agent-rules.md §1`).
- **Adding the `AiAgentId` member but not the `AI_AGENT_DEFAULTS` entry** — `tsc` fails
  (the `Record<AiAgentId, …>` gate). (And if you suppressed it, `buildAgentConfigWithDefaults`
  throws `Unknown agent ID` at runtime.)
- **Hand-typing the agent string** (`'phishing_triage'` vs `'phishing-triage'`) — the enum
  values mix `_` and `-`; a drifted string silently mis-routes. Use the `AiAgentId` member.
- **Leaving `provider_mode` a free string / `trigger_config` a generic record** — standing
  #93/#94 violations. Use `z.nativeEnum(AiProviderMode)` and the per-mode trigger schema.
- **Hardcoding one provider or short-circuiting the cascade / adding a mock mode** — #88/#89.
- **Running a destructive/governed action without a persisted `AiApprovalRequest`** — #97;
  AGENTS.md §7. The orchestrator persists it _before_ the job; do not route around that.
- **Re-implementing the quota/approval/budget checks** in a service or handler — they live
  in `canAgentExecute()`/`requiresApproval()`. Set policy via config; don't duplicate logic.
- **Adding a second `@Cron` that touches AI**, or `await`-ing an event listener in a
  business path — both break the trigger contract (§3/§4). Schedule via
  `AgentSchedulerService`; `void` the listener.
- **Adding a new job type** instead of extending the `AI_AGENT_TASK` payload.
- **Secrets in the agent config / job payload / approval `actionData` / logs**, or an OSINT
  key stored unencrypted / a source URL not SSRF-validated (#24/#95/#96).
- **`update`/upsert by `agentId` alone** (not `[tenantId, agentId]`) — tenant-isolation
  breach (#26).
- **New `messageKey` missing from one of the 6 locale files** (#49), or a new endpoint
  without its Next.js proxy route (#86) / a half-wired new permission (#85).
- File named `*.util.ts`/`*.utils.ts`, `any`, `!`, `==`, `console.log`, bare `crypto`
  import, semicolons → ESLint/Prettier failures (CLAUDE.md #1–#11, #69).
- **Claiming gates passed without running them** (AGENTS.md §5/§13).

---

## Final checklist

- [ ] Branch created (`feat/ai-agent-<agent-id>`), not on `main`/`master`.
- [ ] New agent added to **both** `AiAgentId` (`ai-agent-config.enum.ts`) **and**
      `AI_AGENT_DEFAULTS` (`agent-config.constants.ts`); alias wired in `AGENT_ALIAS_MAP`
      if it delegates; `resolveExecutionAgent` returns the right executor.
- [ ] `provider_mode` validated by `AiProviderMode` (`z.nativeEnum`), enum exported from
      `common/enums/index.ts`, legacy `'default'` rows still resolve through the cascade
      (or the standing #93 gap is explicitly flagged in the report).
- [ ] `triggerMode` is `AiTriggerMode`; **`trigger_config` validated by a mode-specific
      schema** (manual/auto_on_alert/auto_by_agent/scheduled), 64KB-capped, all
      strings/arrays `.max()`-bounded (#94/#78/#27/#28).
- [ ] Quota (`tokensPer*`, `maxConcurrentRuns`) and approval policy set via config; the
      orchestrator's `canAgentExecute` (enabled → mode → quota → budget) and
      `requiresApproval` chains are **not** re-implemented or bypassed.
- [ ] Triggers wired correctly: event listener is `try/catch` no-throw + `void`-ed;
      scheduled work goes through `AgentSchedulerService` (no new `@Cron`); manual via the
      RBAC-guarded dispatch endpoint.
- [ ] Dispatch path enqueues `JobType.AI_AGENT_TASK` (no new job type); `AI_AGENT_TASK`
      handler still registered (`jobs.module.ts:99`); any new payload field is read
      defensively, tenant-scoped, **no secrets**.
- [ ] Destructive/governed actions persist an `AiApprovalRequest` before execution (#97).
- [ ] Prisma migration added + applied **only if** a column/seed changed (CLAUDE.md #30/#15);
      `prisma:generate` run if schema changed.
- [ ] RBAC/throttle reused or, for a new endpoint/permission, fully wired end-to-end
      (#85/#86) with all 6 i18n locale files updated for any new `messageKey` (#49).
- [ ] Specs added (canExecute messageKeys, requiresApproval matrix, trigger-config
      accept/reject, dispatch enqueues + approval persisted).
- [ ] `pnpm typecheck` ✅ and `pnpm build` ✅ (hard gates — actually run);
      `pnpm --filter @auraspear/api lint:strict` / `format:check` / `test` run and results
      reported.
- [ ] Security: one-door dispatch, tenant-scoped, enums-only, provider cascade intact,
      approval-required for destructive actions, OSINT keys encrypted + SSRF-validated, no
      secrets in payload/logs, no raw AI HTML.
- [ ] Docs/memory updated (`docs/AI.md`/`docs/ai/`, `memory/AI_MEMORY.md`,
      `memory/TECHNICAL_MEMORY.md`; ADR if a notable decision).
- [ ] Final response uses the AGENTS.md §13 template; no "all green" unless every required
      gate actually passed.

```
Branch:
Commits:
Files created:
Files updated:
Commands run:
Green checks:
Failed checks:
Blockers:
Risks:
Next steps:
```
