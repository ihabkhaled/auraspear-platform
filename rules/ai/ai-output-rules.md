# Rules — AI output contracts (typed results, provenance + citations, safe rendering)

> **Read `../../AGENTS.md` first** (repo root) — loading order + the one rule:
> _no AI agent may edit first and understand later_; §7 "AI safety invariants"
> (output carries **provenance** provider/model/confidence + citations, **never
> render raw AI output as HTML**, destructive = approval-required). The contracts
> are source-of-truth code: `packages/ai/src/types.ts` (`AiProvenance`,
> `AiCitation`, `AiFinding`, `RiskScore`, `IocEnrichment`, `IocType`,
> `isHighConfidence`) and `packages/ai/src/safety.ts` (`RiskLevel`,
> `AiActionCategory`). Then `../../docs/AI.md` ("Output contracts"),
> `../../apps/web/CLAUDE.md` rules **42–44, 53, 58**, and `../../apps/api/CLAUDE.md`.

This file governs the **shape of every AI result** — the typed payload an AI
method returns, persists, and ships to the UI. It sits between two siblings; keep
each concern in its home and don't duplicate:

- **`./ai-governance.md`** owns _how_ provenance is produced (provider cascade,
  `recordUsage`, prompt versioning, audit). This file owns _what the result must
  contain_ and _how it is rendered_.
- **`../frontend/ai-ui-rules.md`** owns the _UI mechanics_ (the five states:
  loading/error/confidence/provider/regenerate, dismissibility, localStorage). This
  file owns the _contract_ those components render.

Where this file and a `CLAUDE.md` overlap, the **CLAUDE.md rule number is
authoritative**. These are **hard constraints**, not guidance.

---

## 1. AI results are typed contracts — never loose objects or raw strings

Every structured AI result is one of the contracts in `packages/ai/src/types.ts`
(re-exported from `@auraspear/ai`, `packages/ai/src/index.ts`). **Do not invent a
new ad-hoc result shape**, and do not return a bare `string` / `unknown` /
`Record<string, unknown>` from an AI method that produces a finding, score, or
enrichment.

| Result kind                 | Contract        | Key fields                                                                                                                                       |
| --------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| A discrete security insight | `AiFinding`     | `id`, `title`, `summary`, `severity: RiskLevel`, `category: AiActionCategory`, `recommendation?`, `mitreTechniqueIds`, `citations`, `provenance` |
| An explainable risk score   | `RiskScore`     | `score` (0..100), `level: RiskLevel`, `factors[]` (`name`/`weight`/`detail`), `provenance`                                                       |
| IOC reputation/enrichment   | `IocEnrichment` | `ioc`, `type: IocType`, `malicious`, `falsePositiveLikelihood` (0..1), `tenantHistoryHits`, `citations`, `provenance`                            |

- **Reuse the enums, never string literals** — `severity`/`level`/`risk` are
  `RiskLevel` (`low`/`medium`/`high`/`critical`), `category` is `AiActionCategory`,
  IOC kind is `IocType` (`ip`/`domain`/`url`/`hash`/`email`). This is `no-explicit-any`
  - the "no string-literal unions / enums only" rules on both sides
    (`apps/api/CLAUDE.md` #12, `apps/web/CLAUDE.md` #17) — a hand-typed `'high'`
    drifts and breaks the renderer.
- **`RiskScore` must be explainable** — `factors[]` is required, not decorative.
  A score with no factors is not shippable; the UI renders the breakdown. Numbers
  stay in their documented ranges (`score` 0..100, `falsePositiveLikelihood` /
  `confidence` 0..1) — clamp at the producer, never let the model emit out-of-range.
- The api's persisted/transport counterparts (`apps/api/src/modules/ai/ai.types.ts`,
  the `AiFinding` Prisma model behind `/ai/findings`, status via
  `AiFindingStatus` `PROPOSED`/`APPLIED`/`DISMISSED`/`FAILED`) **must stay
  structurally aligned** with these package contracts — same fields, same enums.
  Don't let the wire shape and the `@auraspear/ai` shape diverge.

## 2. Every result carries provenance — non-negotiable, never fabricated

`AGENTS.md §7`: AI output **must** carry provenance. `AiFinding`, `RiskScore`, and
`IocEnrichment` all have a **required** `provenance: AiProvenance`
(`packages/ai/src/types.ts`):

```ts
interface AiProvenance {
  readonly provider: AiProviderKind // bedrock | llm_apis | openclaw_gateway | rule-based
  readonly model: string // concrete model id that answered
  readonly confidence?: number // 0..1 — OMIT when not calibrated
  readonly promptVersion?: string // ties result → exact prompt
  readonly tokensIn?: number
  readonly tokensOut?: number
  readonly generatedAtIso: string
}
```

- **`provider`/`model` come from the connector that actually answered the cascade**,
  not the one the analyst selected — they differ on failover. Producing those
  values is `./ai-governance.md §2`; this rule is that **no result leaves the
  producer without `provenance` populated**.
- **Never fabricate `confidence`.** It is optional — **omit it** when the provider
  cannot express calibrated confidence; the UI then omits the badge
  (`../frontend/ai-ui-rules.md §1`). Do not synthesize a number to fill the field.
- **`confidence` ≥ threshold checks use `isHighConfidence(provenance, 0.7)`**
  from `packages/ai/src/types.ts` — never re-implement the 0.7 cutoff inline
  (the `/ai/findings` "high confidence" KPI depends on the same threshold).
- The rule-based fallback still attaches provenance with
  `provider: AiProviderKind.RULE_BASED` / `model: 'rule-based'` so the analyst sees
  a real model did not answer (`apps/web/CLAUDE.md` #30, `./ai-governance.md §1`).

## 3. Citations: claims are sourced, not asserted

`AiFinding` and `IocEnrichment` carry a **required** `citations: readonly
AiCitation[]` (`packages/ai/src/types.ts`):

```ts
interface AiCitation {
  readonly label: string // human-readable
  readonly sourceRef: string // connector name, alert id, MISP event — where the claim came from
}
```

- A malicious/IOC verdict or a finding recommendation **should be traceable to a
  source** (connector, alert id, MISP/intel event, tenant history). Build
  `citations` from the evidence the producer actually used — do not emit citations
  the model invented (a citation must point at a real `sourceRef` in this tenant).
- Citations are **tenant-scoped data** like everything else (`AGENTS.md §6`): a
  `sourceRef` must reference a record the caller's `tenantId` owns. Never cite a
  cross-tenant alert/case/IOC. `IocEnrichment.tenantHistoryHits` is likewise a
  per-tenant count, never global.
- An empty `citations: []` is valid only when there genuinely is no source (e.g.
  a pure-reasoning summary) — prefer surfacing "no sources" over a fabricated one.

## 4. Never render raw AI output as HTML (contract-side invariant)

`AGENTS.md §7` + `apps/web/CLAUDE.md` #43 + `react/no-danger` (ESLint **error**):
**no `dangerouslySetInnerHTML` with AI content.** This file states it as a
contract rule; the UI mechanics live in `../frontend/ai-ui-rules.md §2`.

- AI text fields (`summary`, `recommendation`, factor `detail`, chat content) are
  **untrusted strings**. Render as **plain text** or **sanitized markdown**
  (DOMPurify, no raw-HTML passthrough) — never as HTML, never as a `javascript:`
  URL, never interpolated into `innerHTML`. There is zero `dangerouslySetInnerHTML`
  in the codebase today — keep it that way (`apps/web/CLAUDE.md` Security #36).
- Treat model text as data even in non-UI sinks: don't `eval`/`new Function`/
  template it into a query or shell. (`no-eval`/`no-new-func` are ESLint errors on
  both sides; Elasticsearch query strings still go through `sanitizeEsQueryString()`,
  `apps/api/CLAUDE.md` #79.)

## 5. No raw AI inter-agent JSON in user-facing UI

`apps/web/CLAUDE.md` #58: **never render raw inter-agent / orchestrator hand-off
JSON** in user-facing UI. The structured contracts in §1 are the _user-facing_
shape; the JSON agents pass between themselves is **internal** and must be
**transformed to human-readable before rendering**.

- Map an agent payload into an `AiFinding` / `RiskScore` / `IocEnrichment` (or a
  rendered markdown summary) before it reaches a panel. Do not `JSON.stringify` an
  orchestrator result into the UI.
- Raw inter-agent JSON belongs only in debug/transcript views
  (`apps/web/src/components/ai-transcripts/`), and even there it is **escaped
  text, never HTML** (`../frontend/ai-ui-rules.md §2`).
- Mapping AI payload → render-ready props happens in the AI hook or a
  `src/lib/<domain>.utils.ts` mapper, never inside a `.tsx`
  (`../frontend/component-rules.md`, `apps/web/CLAUDE.md` #60).

## 6. Structured blocks use the standardized renderer — and show provider/confidence

`apps/web/CLAUDE.md` #53: every rich/structured AI output block (risk gauges, IOC
tables, MITRE ATT&CK maps, timelines) MUST use a **standardized renderer component
from `apps/web/src/components/ai-renderer/`**. No inline ad-hoc rendering.

- **One contract → one renderer.** A `RiskScore` renders through the risk-gauge/
  factor renderer; an `IocEnrichment` through the IOC renderer; an `AiFinding`
  through the finding card. Simple single-value results may use `AiResultCard`
  (`@/components/common`) — it has confidence + provider badges built in. Richer
  blocks get a dedicated component under `ai-renderer/`, barrel-exported.
- **The renderer always surfaces provider + confidence** when present (the §2
  data): provider attribution (`provenance.provider`/`model`, or `rule-based`) and
  the confidence badge when `confidence` is set — omitted when it isn't
  (`apps/web/CLAUDE.md` #42, `../frontend/ai-ui-rules.md §1`). For DataTable cells
  use `renderConfidenceBadge` from `@/lib/column-renderers`.
- **Select the renderer by enum, never a raw string** — `AiOutputFormat`
  (`apps/web/src/enums/ai-config.enum.ts`: `STRUCTURED_JSON` / `MARKDOWN` /
  `RICH_CARDS` / `PLAIN_TEXT`) chooses the path (`apps/web/CLAUDE.md` #17, #53).

## 7. Category + approval status are part of the contract

`AiFinding.category` is an `AiActionCategory` (`packages/ai/src/safety.ts`:
`analysis-only` / `suggested` / `approval-required` / `auto-allowed`). The
contract carries it so the UI can **label every action** (`apps/web/CLAUDE.md`
#44) and **gate destructive ones**.

- **The category is set by policy, not by the renderer.** A finding whose
  recommendation mutates security/infra state (run a playbook, close an alert,
  isolate a host) is `approval-required`, never `auto-allowed` — derive it with
  `evaluateApproval(action)` from `packages/ai/src/safety.ts` (conservative:
  anything `destructive` or high/critical `RiskLevel` requires approval). Never
  hand-label `auto-allowed` to skip the gate (`./ai-governance.md §6`,
  `apps/api/CLAUDE.md` #97).
- `approval-required` results render an approval-status badge driven by
  `ApprovalStatus` (`PENDING`/`APPROVED`/`REJECTED`/`EXPIRED`), and the
  apply/execute control stays **disabled until `APPROVED`** — the frontend never
  fabricates approval; the backend persists the `ApprovalRequest`
  (`apps/web/CLAUDE.md` #59, `../frontend/ai-ui-rules.md §4`).

## 8. Tenancy, secrets, and redaction apply to the output too

- **Every AI result is tenant-scoped** (`AGENTS.md §6`): findings, scores,
  enrichments, citations, and `tenantHistoryHits` belong to one `tenantId`. A
  result built from another tenant's evidence is a tenant-isolation violation, not
  a rendering bug. Persisted reads/writes (`/ai/findings`) scope by `tenantId` and
  every `update`/`delete` carries it (`apps/api/CLAUDE.md` #26).
- **No secrets in the contract.** A `summary`, `recommendation`, citation, or
  `factors[].detail` must not contain credentials, tokens, keys, or PII —
  `redact()` (`packages/ai/src/redaction.ts`) runs before the model call and before
  transcript storage (`./ai-governance.md §5`). Connector secrets are AES-256-GCM
  at rest and **never appear in a result, transcript, log, or citation**
  (`../security/secret-handling.md`).

---

### Quick gate

Before you commit code that produces or renders an AI result, confirm: (1) it is a
typed `AiFinding` / `RiskScore` / `IocEnrichment` from `@auraspear/ai` — no ad-hoc
object, enums (`RiskLevel`/`AiActionCategory`/`IocType`) not string literals,
numbers in range, `RiskScore.factors` non-empty; (2) **`provenance` is populated**
(real `provider`/`model`; `confidence` omitted when uncalibrated, never
fabricated; `isHighConfidence` for the ≥0.7 check); (3) `citations` reference real,
**same-tenant** sources; (4) **no `dangerouslySetInnerHTML`** — AI text is plain
text / sanitized markdown; (5) **no raw inter-agent JSON** in user-facing UI —
transformed first; (6) structured blocks render via `src/components/ai-renderer/`
and surface provider + confidence; (7) `category` is policy-derived, and
`approval-required` results gate apply/execute behind an `ApprovalStatus` badge;
(8) everything is `tenantId`-scoped and secret-free (`redact()` ran). No `any`, no
`eslint-disable`. Run `pnpm typecheck` (blocking; `tsgo`/`typecheck:fast`
advisory) and `pnpm lint` — don't claim green until both pass
(`../global/validation-gates.md`). pnpm only, Node 22. **Branch first — never work
on `main`.** Prove before deleting a contract field/enum/renderer (`AGENTS.md §8`).

## Related

- `../../AGENTS.md` — §7 AI safety invariants (provenance, no raw HTML, approval),
  §6 tenancy/secrets, §8 branch safety.
- `packages/ai/src/types.ts` — `AiProvenance`, `AiCitation`, `AiFinding`,
  `RiskScore`, `IocEnrichment`, `IocType`, `isHighConfidence`; `safety.ts` —
  `RiskLevel`, `AiActionCategory`, `evaluateApproval`; `index.ts` re-exports.
- `./ai-governance.md` — how provenance/provider/cost/audit are produced (the
  cascade, `recordUsage`, prompt versioning); `./ai-agent-rules.md` — agent
  dispatch + approval persistence.
- `../frontend/ai-ui-rules.md` — UI mechanics: the five states, dismissibility,
  `ai-renderer/`, approval badges, localStorage; `../frontend/component-rules.md`
  — `.tsx` render-only.
- `../../apps/web/CLAUDE.md` — #42 (five states), #43 (no raw HTML), #44 (action
  category), #53 (standardized renderer), #58 (no inter-agent JSON), #59 (approval
  badge), #60 (derived values in the hook).
- `../../apps/api/CLAUDE.md` — #26 (tenant-scoped update/delete), #79
  (ES query sanitization), #97 (persisted approval); `apps/api/src/modules/ai/`
  (`ai.types.ts`, `feature-catalog/`, `prompt-registry/`).
- `../../docs/AI.md` — output contracts, redaction, governance checklist;
  `../security/secret-handling.md` — connector AES-256-GCM, redaction.
