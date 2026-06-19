# AuraSpear — Personas (mapped to code roles)

> **AI agents and contributors: read [`AGENTS.md`](../../AGENTS.md) first.** It is
> the single entry point — it defines the read-before-edit loading order, the
> security/AI invariants, and the command map. This file is a **business
> artifact**, not a source of truth for authorization. The authoritative role
> and permission definitions live in code (cited inline below); when this doc and
> the code disagree, **the code wins** and this doc should be corrected.

## How to read this file

Each persona is mapped 1:1 to a backend `UserRole` enum value
(`apps/api/src/common/interfaces/authenticated-request.interface.ts`). Roles are
ordered by the canonical privilege hierarchy (`ROLE_HIERARCHY`, most → least
privileged). Every persona's capabilities are grounded in the default permission
matrix at
[`apps/api/src/modules/role-settings/constants/default-permissions.ts`](../../apps/api/src/modules/role-settings/constants/default-permissions.ts).

These seven personas are the subset called out in the product brief
([`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md) "Who it is for"). The
`UserRole` enum and the default-permissions map define **twelve** roles in total
— `DETECTION_ENGINEER`, `INCIDENT_RESPONDER`, `THREAT_INTEL_ANALYST`,
`SOAR_ENGINEER`, and `AUDITOR_READONLY` are real, seeded roles not profiled here.
See [Roles not profiled here](#roles-not-profiled-here) before assuming a
capability is absent.

**Permissions are dynamic, not hardcoded.** The matrix above is only the
**seed-time default**. A `TENANT_ADMIN` (or `GLOBAL_ADMIN`) can re-grant or
revoke any permission per role via Role Settings
(`Permission.ROLE_SETTINGS_UPDATE`), and `GLOBAL_ADMIN` always passes every
`@RequirePermission(...)` check regardless of the matrix
(`apps/api/CLAUDE.md` rule 25). So treat each persona's permission list as the
_default posture_, not a hard ceiling.

### Invariants that constrain every persona

These hold no matter what the persona "wants" (see [`AGENTS.md`](../../AGENTS.md)
§6–7 and `rules/security/`, `rules/ai/`):

- **Tenant isolation** — a persona only ever sees its own tenant's data; every
  query/`update`/`delete` is `tenantId`-scoped. `GLOBAL_ADMIN` and
  `PLATFORM_OPERATOR` switch tenant _context_ via `X-Tenant-Id`; they do not see
  cross-tenant data in a single view.
- **RBAC** — every endpoint is gated by `@RequirePermission(...)`. A persona
  cannot perform an action it lacks the permission for, even if the UI is reached
  some other way.
- **AI is approval-gated for destructive actions** — AI may _analyze and
  suggest_, but anything destructive is `approval-required` and creates a
  persisted `ApprovalRequest` before execution. No persona's AI runs a
  destructive action silently.
- **Raw AI output is never rendered as HTML** — every persona sees AI as markdown
  or plain text with provenance (provider/model/confidence), never executed HTML.

---

## Persona 1 — Priya, Platform / MSSP Owner

|                        |                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Code role**          | `GLOBAL_ADMIN` (`apps/web` label: "Global Admin")                                                                                                                               |
| **Hierarchy**          | #1 — most privileged                                                                                                                                                            |
| **Permission posture** | All permissions, always — omitted from `DEFAULT_PERMISSIONS` by design; bypasses every `@RequirePermission` check                                                               |
| **Tenant scope**       | Cross-tenant: switches context via `X-Tenant-Id` header (auth guard override). Seeded `GLOBAL_ADMIN` accounts are `isProtected` and cannot be deleted, blocked, or role-changed |

**Who she is.** The MSSP's platform owner / super-admin. She stands up the
platform, onboards customer tenants, and is the break-glass account when a tenant
locks itself out.

**Goals.**

- Run many customer environments from one pane of glass without leaking data
  across tenants.
- Switch into any tenant to diagnose, configure, or recover it.
- Keep the platform itself healthy (jobs, connectors, system health).

**Pains.**

- Cross-tenant blast radius — one wrong config touches a real customer.
- Needs to _act inside_ a tenant without permanently being a member of it.
- Audit pressure: every privileged action she takes must be traceable.

**Key workflows.**

- **Tenant switch** — sends `X-Tenant-Id`; the auth guard overrides
  `request.user.tenantId` so `@TenantId()` returns the switched tenant
  (`apps/api/CLAUDE.md` §"GLOBAL_ADMIN tenant switching"; web `TenantSwitcher`).
- **Recovery / break-glass** — re-grant a role's permissions, unblock a user,
  re-enable a connector inside a customer tenant.
- **Platform operations** — `JOBS_*`, `SYSTEM_HEALTH_VIEW`, full connector and AI
  config control.

**AI relationship.** Full AI access including governance surfaces
(`ai-finops`, `ai-eval`, `ai-ops`, `ai-simulations`); approves
`approval-required` AI actions tenant-wide (`AI_APPROVALS_MANAGE`).

---

## Persona 2 — Owen, Platform Operator (MSSP SRE)

|                        |                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Code role**          | `PLATFORM_OPERATOR` (label: "Platform Operator")                                                                                                                                                                                                                                                                                                                                       |
| **Hierarchy**          | #2                                                                                                                                                                                                                                                                                                                                                                                     |
| **Permission posture** | Platform-plane focus: `MSSP_DASHBOARD_VIEW`, full `CONNECTORS_*` + `LLM_CONNECTORS_*`, full `AI_CONFIG_*`, `AI_APPROVALS_MANAGE`, `JOBS_*` (incl. `JOBS_CANCEL_ALL`), `SYSTEM_HEALTH_VIEW`, `ADMIN_TENANTS_VIEW`, full AI governance (`AI_FINOPS_*`, `AI_EVAL_*`, `AI_SIMULATION_*`, `AI_OPS_VIEW`). **Notably lacks** `ALERTS_*`, `CASES_*`, `INCIDENTS_*`, `HUNT_*`, `ADMIN_USERS_*` |
| **Tenant scope**       | Like `GLOBAL_ADMIN`, switches tenant context via `X-Tenant-Id` (`PRODUCT_BRIEF.md`) but is not a tenant member by default                                                                                                                                                                                                                                                              |

**Who he is.** The MSSP's operations/SRE persona. He keeps the _plumbing_
running — connectors, AI providers, background jobs, platform health — but is
deliberately **not** an investigator. He configures the SOC; he doesn't work
cases in it.

**Goals.**

- Keep every tenant's connectors (Wazuh, OpenSearch, MISP, Shuffle, Bedrock/LLM)
  healthy and synced.
- Keep the AI cascade configured and within budget across tenants.
- Unstick the job pipeline before analysts notice.

**Pains.**

- A misconfigured connector URL or credential silently breaks detection for a
  whole tenant (SSRF-validated, AES-256-GCM-encrypted at rest — by design).
- Jobs sitting `PENDING`/`RUNNING` with no handler or a down Redis
  (`apps/api/CLAUDE.md` rules 90–91).
- AI spend drift across many tenants.

**Key workflows.**

- **Connector lifecycle** — create/update/test/sync connectors and LLM
  connectors per tenant; never sees the case data flowing through them.
- **AI platform governance** — manage prompts, triggers, OSINT sources, approval
  policy, FinOps budgets, eval and simulation runs.
- **Job & health ops** — `JOBS_MANAGE`/`JOBS_CANCEL_ALL`, watch
  `SYSTEM_HEALTH_VIEW`.

**AI relationship.** Owns AI _configuration and governance_, not AI
_investigation_ — he has the `ai-finops`/`ai-eval`/`ai-ops` surfaces but no
alert/case copilot need.

---

## Persona 3 — Tara, Tenant (SOC) Administrator

|                        |                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Code role**          | `TENANT_ADMIN` (label: "Tenant Admin")                                                                                                                                                                                                                                                                                                                                    |
| **Hierarchy**          | #3                                                                                                                                                                                                                                                                                                                                                                        |
| **Permission posture** | The broadest _in-tenant_ role — full create/update/delete across alerts, cases, incidents, hunts, correlation, detection rules, SOAR, reports, connectors, cloud security, compliance, attack paths, UEBA, normalization, vulnerabilities. Plus tenant governance: `ADMIN_USERS_*`, `ROLE_SETTINGS_VIEW/UPDATE`, `USERS_CONTROL_*` (sessions + force-logout), full `AI_*` |
| **Tenant scope**       | Single tenant — her own. No cross-tenant context switching                                                                                                                                                                                                                                                                                                                |

**Who she is.** The customer-side SOC lead / tenant owner. Within her tenant she
is effectively root: she shapes who can do what, wires up integrations, and owns
the team.

**Goals.**

- Onboard and govern her SOC team (create users, assign roles, tune the role
  permission matrix).
- Own integrations and detection content for her tenant.
- Enforce least privilege without filing tickets to the MSSP.

**Pains.**

- She is the bottleneck — every permission change, connector, and user lands on
  her.
- Must not accidentally over-grant (Role Settings makes this easy to get wrong;
  every change is audit-logged).
- Protected/seeded users and self-action guards (can't delete/block herself or
  `isProtected` users) — by design, occasionally surprising.

**Key workflows.**

- **Team & RBAC management** — `ADMIN_USERS_*` (soft-delete/restore, block/unblock
  — never hard delete), tune `ROLE_SETTINGS_UPDATE`, terminate sessions with
  `USERS_CONTROL_FORCE_LOGOUT*`.
- **Integration & content ownership** — connectors, detection rules, correlation,
  SOAR, normalization for her tenant.
- **AI ownership** — `AI_AGENTS_*` (create/update/delete agents),
  `AI_APPROVALS_MANAGE`, `AI_CONFIG_*`, all copilots.

**AI relationship.** Configures and approves AI for the whole tenant; the only
in-tenant persona that can create/delete agents and approve destructive AI
actions.

---

## Persona 4 — Sam, Senior SOC Analyst (Tier 2)

|                        |                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Code role**          | `SOC_ANALYST_L2` (label: "SOC Analyst L2")                                                                                                                                                                                                                                                                                                                                                                                            |
| **Hierarchy**          | #9 (most senior of the investigation analyst tiers in this set)                                                                                                                                                                                                                                                                                                                                                                       |
| **Permission posture** | Investigation-heavy: `ALERTS_INVESTIGATE/ACKNOWLEDGE/CLOSE/ESCALATE`, `CASES_*` (create/update/assign/status/comments/tasks/artifacts — **no `CASES_DELETE`**), `INCIDENTS_CREATE/ADD_TIMELINE/CHANGE_STATUS` (**no delete**), `EXPLORER_QUERY`, `REPORTS_CREATE/EXPORT`. **View-only** on correlation, detection rules, SOAR, vulnerabilities, attack paths, UEBA, cloud security, compliance. `AI_AGENTS_EXECUTE` (run, not author) |
| **Tenant scope**       | Single tenant                                                                                                                                                                                                                                                                                                                                                                                                                         |

**Who he is.** The senior front-line investigator. He owns the hard alerts L1
escalates, drives cases to closure, and opens incidents — but he does not author
detection content or delete records.

**Goals.**

- Triage and _close_ the alerts that matter; escalate the rest.
- Run a case end-to-end (tasks, artifacts, notes, linked alerts, status).
- Pivot fast through raw data with Explorer when the canned views aren't enough.

**Pains.**

- Alert fatigue — separating signal from noise (AuraSpear's core promise:
  AI-assisted triage to cut MTTR).
- Read-only on the detection content that generates his false positives — he can
  see correlation/detection rules but must hand a `TENANT_ADMIN` /
  `DETECTION_ENGINEER` the fix.
- Can't delete a mistaken case — only update/close (intentional guardrail).

**Key workflows.**

- **Alert → case → incident** — investigate, acknowledge, close or escalate an
  alert; spin up and run a case; open an incident with timeline.
- **Explorer pivots** — `EXPLORER_QUERY` against raw telemetry.
- **AI-assisted triage** — runs `AI_ALERT_TRIAGE`, `AI_CASE_COPILOT`, executes
  agents (`AI_AGENTS_EXECUTE`).

**AI relationship.** Heavy _consumer_ of AI (triage, case copilot, agent runs);
cannot author agents or approve destructive AI actions — those route up to
`TENANT_ADMIN`.

---

## Persona 5 — Hana, Threat Hunter

|                        |                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Code role**          | `THREAT_HUNTER` (label: "Threat Hunter")                                                                                                                                                                                                                                                                                                                                                                           |
| **Hierarchy**          | #8                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Permission posture** | Hunt-centric: full `HUNT_*` (view/create/update/delete/**execute** — the only profiled persona besides `TENANT_ADMIN` with `HUNT_EXECUTE`), `EXPLORER_QUERY`, `ATTACK_PATHS_CREATE/UPDATE`, `REPORTS_CREATE/EXPORT`, `CASES_CREATE/ADD_COMMENT/ADD_ARTIFACT` (to capture findings). **View-only** on alerts, detection rules, correlation, intel, UEBA, vulnerabilities. `AI_AGENTS_EXECUTE`, `AI_HANDOFF_PROMOTE` |
| **Tenant scope**       | Single tenant                                                                                                                                                                                                                                                                                                                                                                                                      |

**Who she is.** The proactive hunter. She isn't waiting on alerts — she forms a
hypothesis, queries telemetry, runs hunts, maps attack paths, and promotes what
she finds into cases and detection-worthy signals.

**Goals.**

- Author and _execute_ hunts against the tenant's data (`HUNT_EXECUTE`).
- Explore freely and map attack paths.
- Turn a confirmed finding into a case and hand it off (`AI_HANDOFF_PROMOTE`).

**Pains.**

- She can _propose_ detection content but is **view-only** on detection rules and
  correlation — net-new detections must go through `TENANT_ADMIN` /
  `DETECTION_ENGINEER`.
- Hunt runs follow a strict state machine (`running → completed | error`;
  `apps/api/CLAUDE.md` rule 40) — no arbitrary re-runs of a finished hunt.
- Lightweight case rights only (create/comment/artifact, no full case update) —
  she captures, she doesn't manage the case lifecycle.

**Key workflows.**

- **Hypothesis → hunt → finding** — create + execute a hunt, pivot in Explorer,
  build an attack path, capture results into a case.
- **Promote / hand off** — `AI_HANDOFF_PROMOTE` to push a hunt finding into the
  investigation flow.

**AI relationship.** Runs agents to accelerate hunts (`AI_AGENTS_EXECUTE`) and
uses AI handoff to promote findings; consumer, not author, of AI config.

---

## Persona 6 — Leo, Junior SOC Analyst (Tier 1)

|                        |                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Code role**          | `SOC_ANALYST_L1` (label: "SOC Analyst L1")                                                                                                                                                                                                                                                                                                                                |
| **Hierarchy**          | #10                                                                                                                                                                                                                                                                                                                                                                       |
| **Permission posture** | Deliberately narrow front line: `ALERTS_VIEW` + `ALERTS_ACKNOWLEDGE` only (**no investigate/close/escalate**), `CASES_VIEW/CREATE/ADD_COMMENT/CHANGE_STATUS` (no assign/update/delete/tasks/artifacts), broad **view-only** access (incidents, intel, reports, compliance, vulnerabilities). `AI_AGENTS_VIEW` (**no `AI_AGENTS_EXECUTE`**), `AI_CONFIG_VIEW`. No Explorer |
| **Tenant scope**       | Single tenant                                                                                                                                                                                                                                                                                                                                                             |

**Who he is.** The entry-tier analyst on the queue. He's the first set of eyes:
acknowledge, do initial notes, open a case, and escalate by handing it to L2 —
not by closing it himself.

**Goals.**

- Work the alert queue: acknowledge and triage at first level.
- Capture context (create a case, add a comment) so L2 has a head start.
- Learn the environment safely without being able to break things.

**Pains.**

- Can acknowledge but **cannot investigate, close, or escalate** an alert in the
  formal sense — his "escalation" is creating/commenting a case for L2 to pick
  up.
- No Explorer access — he works within the curated views.
- Can _see_ AI agents but **cannot run them** (`AI_AGENTS_VIEW` without
  `AI_AGENTS_EXECUTE`) — AI assistance for him is read-only/observational.

**Key workflows.**

- **Queue triage** — `ALERTS_ACKNOWLEDGE`, read the alert, create a case with a
  comment, set case status.
- **Hand-up** — surfaces work to `SOC_ANALYST_L2` via the case rather than direct
  alert escalation.

**AI relationship.** Lightest of the analyst tiers — observes AI agents and
config, has chat + memory (`AI_CHAT_ACCESS`, `AI_MEMORY_*`), but does not execute
agents or copilots by default.

---

## Persona 7 — Dana, Executive / CISO (Read-Only)

|                        |                                                                                                                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Code role**          | `EXECUTIVE_READONLY` (label: "Executive (Read-Only)")                                                                                                                                                                                   |
| **Hierarchy**          | #11 — least privileged profiled persona                                                                                                                                                                                                 |
| **Permission posture** | Pure read + export. `DASHBOARD_VIEW`, **view-only** alerts/cases/incidents/intel/UEBA/cloud-security/compliance, `REPORTS_VIEW` + **`REPORTS_EXPORT`**. No create/update/delete anything. No Explorer, no agent execution, no AI config |
| **Tenant scope**       | Single tenant                                                                                                                                                                                                                           |

**Who she is.** The CISO / executive stakeholder. She doesn't work the SOC; she
needs assurance, posture, and board-ready numbers — without any ability (or
temptation) to change operational state.

**Goals.**

- See SOC posture at a glance (dashboards, open cases/incidents, compliance
  status).
- Export reports for the board / auditors (`REPORTS_EXPORT`).
- Ask questions in natural language without touching live operations.

**Pains.**

- Needs the _story_, not the raw queue — depends on dashboards, reports, and AI
  summaries staying readable and trustworthy.
- Must trust AI output she reads — provenance (provider/model/confidence) and the
  "never render raw AI as HTML" invariant exist precisely for this audience.

**Key workflows.**

- **Posture review** — dashboards, compliance status, UEBA and cloud-security
  summaries (all read-only).
- **Report export** — `REPORTS_EXPORT` for board/audit decks.
- **AI Q&A** — `AI_CHAT_ACCESS` + `AI_MEMORY_*` to ask questions; `AI_FINOPS_VIEW`
  to see AI spend. She consumes AI; she configures nothing.

**AI relationship.** Read-only consumer. Chat and memory only — no agent
execution, no copilots, no approvals. The AI safety invariants (provenance, no
raw HTML) are what make her trust in the output defensible.

---

## Persona ↔ role quick map

| Persona                     | Code role (`UserRole`) | Hierarchy | One-line posture                                                           |
| --------------------------- | ---------------------- | --------- | -------------------------------------------------------------------------- |
| Priya — Platform/MSSP Owner | `GLOBAL_ADMIN`         | #1        | All permissions, cross-tenant context switch, break-glass                  |
| Owen — Platform Operator    | `PLATFORM_OPERATOR`    | #2        | Platform plane: connectors, AI config/governance, jobs — not investigation |
| Tara — Tenant Admin         | `TENANT_ADMIN`         | #3        | In-tenant root: users, RBAC, integrations, content, AI ownership           |
| Sam — Senior Analyst (L2)   | `SOC_ANALYST_L2`       | #9        | Investigate/close/escalate, full case lifecycle, run AI copilots           |
| Hana — Threat Hunter        | `THREAT_HUNTER`        | #8        | Author + execute hunts, Explorer, attack paths, AI handoff                 |
| Leo — Junior Analyst (L1)   | `SOC_ANALYST_L1`       | #10       | Acknowledge + capture; view-only AI; hands up to L2                        |
| Dana — Executive (CISO)     | `EXECUTIVE_READONLY`   | #11       | Read + export only; AI chat consumer                                       |

## Roles not profiled here

The product brief profiles seven personas, but the system defines twelve roles
(`UserRole`, `ROLE_HIERARCHY`). Do **not** assume the following are unsupported —
they are seeded with their own default permission sets in
[`default-permissions.ts`](../../apps/api/src/modules/role-settings/constants/default-permissions.ts):

| Code role              | Hierarchy | In one line                                                                                                      |
| ---------------------- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| `DETECTION_ENGINEER`   | #4        | Owns detection content: full `DETECTION_RULES_*`, `CORRELATION_*`, `NORMALIZATION_*`; mostly view-only elsewhere |
| `INCIDENT_RESPONDER`   | #5        | IR-focused: full alert + case + incident lifecycle, `SOAR_EXECUTE`, `AI_HANDOFF_PROMOTE`                         |
| `THREAT_INTEL_ANALYST` | #6        | Intel + IOC enrichment: `INTEL_VIEW`, connector test/sync, vulnerabilities, attack-path view                     |
| `SOAR_ENGINEER`        | #7        | Automation author: full `SOAR_*` + `AI_AGENTS_*` create/update/delete                                            |
| `AUDITOR_READONLY`     | #12       | Broad read-only + audit/transcript export for compliance review                                                  |

When a persona needs a capability it lacks by default, the correct move is **not**
to widen its matrix in code — it is either (a) the dedicated role above, or
(b) a `ROLE_SETTINGS_UPDATE` grant by a `TENANT_ADMIN`/`GLOBAL_ADMIN`. Never
bypass `@RequirePermission` to satisfy a persona story.

---

## Where to go next

- Onboarding entry point: [`AGENTS.md`](../../AGENTS.md)
- Business summary: [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md) · deep
  product reference: [`docs/PRODUCT.md`](../PRODUCT.md)
- Authoritative roles/permissions:
  [`apps/api/src/common/interfaces/authenticated-request.interface.ts`](../../apps/api/src/common/interfaces/authenticated-request.interface.ts)
  (`UserRole`, `ROLE_HIERARCHY`),
  [`apps/api/src/modules/role-settings/constants/default-permissions.ts`](../../apps/api/src/modules/role-settings/constants/default-permissions.ts)
  (`DEFAULT_PERMISSIONS`), and the `Permission` enum at
  `apps/api/src/common/enums/permission.enum.ts`
- Hard rules: [`rules/`](../../rules/) (esp. `rules/security/`, `rules/ai/`) ·
  Recipes: [`skills/`](../../skills/) (esp. `skills/backend/add-permission.md`) ·
  Stable memory: [`memory/`](../../memory/) (esp.
  [`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md)) · Working
  context: [`context/`](../../context/)
- RBAC and tenancy invariants in the app guidelines: `apps/api/CLAUDE.md`
  (rules 8, 25, 26, 55, 76; "Role Hierarchy") and `apps/web/CLAUDE.md`

---

_Sources: `apps/api/src/common/interfaces/authenticated-request.interface.ts`,
`apps/api/src/modules/role-settings/constants/default-permissions.ts`,
`apps/web/src/lib/constants/roles.ts`, `apps/web/src/i18n/en.json`
(`roleSettings.roles.*` labels), [`AGENTS.md`](../../AGENTS.md), `apps/api/CLAUDE.md`,
`apps/web/CLAUDE.md`, and [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md).
This is a business artifact; permission lists are seed-time defaults and are
re-configurable at runtime via Role Settings — confirm current state against the
cited code and the live `default-permissions` matrix._
