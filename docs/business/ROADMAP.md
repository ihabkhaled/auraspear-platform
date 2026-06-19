# Business Roadmap — AuraSpear Platform

> **Read [`AGENTS.md`](../../AGENTS.md) first.** It is the single entry point and
> defines the read-before-edit loading order, the security/AI invariants, and the
> command map. This page frames AuraSpear's commercial trajectory in business
> terms — **MVP → beta → enterprise → marketplace**, with **integrations**, **AI
> governance**, and **SOC automation** as cross-cutting tracks. It is **not** a
> source of truth for engineering sequencing or delivered-vs-planned status.

## This is the business view; the engineering roadmap is canonical

The authoritative, phase-by-phase, delivered-vs-planned roadmap is
[`docs/ROADMAP.md`](../ROADMAP.md). It carries the status convention (✅ delivered ·
🔄 in progress/advisory · ⏳ deferred · ☐ planned), traces every "delivered" claim
to milestone evidence in [`docs/audit/FINAL_REPORT.md`](../audit/FINAL_REPORT.md),
and is gated by the validation rules in
[`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md).

**This page does not restate or override those statuses — it maps them to
business stages.** Where the two could appear to disagree, the engineering roadmap
wins. The business stages below are a _narrative_ over the same five technical
phases, not a parallel plan:

| Business stage                           | Maps to engineering phase ([`docs/ROADMAP.md`](../ROADMAP.md)) | Engineering status |
| ---------------------------------------- | -------------------------------------------------------------- | ------------------ |
| **MVP** (validated foundation)           | Phase 1 — MVP (foundation)                                     | ✅ delivered       |
| **Beta** (platform hardening)            | Phase 2 — Beta (platform hardening)                            | ✅ delivered       |
| **Enterprise** (gated, production-grade) | Phase 3 — Enterprise hardening                                 | ☐/⏳ next          |
| **AI governance** (cross-cutting)        | Phase 4 — AI governance & evaluation gate                      | ☐/⏳ planned       |
| **SOC automation + Marketplace**         | Phase 5 — SOC automation & marketplace                         | ☐ planned          |

> Do not over-claim. Per [`AGENTS.md`](../../AGENTS.md) §5, **never present a gate
> as green without running it**, and never market a surface as shipped if
> [`docs/ROADMAP.md`](../ROADMAP.md) marks it ⏳/☐. The commercial direction is
> already summarized in [`docs/business/BUSINESS_GOALS.md`](./BUSINESS_GOALS.md)
> ("Commercial direction": MVP → beta → enterprise → marketplace, with AI
> governance and SOC automation as the differentiators).

## How to read this with the rest of the repo

Load order for the business area (per [`AGENTS.md`](../../AGENTS.md) §1):

1. [`AGENTS.md`](../../AGENTS.md) — entry point + invariants
2. [`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md) +
   [`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md) — stable truths
3. [`context/BUSINESS_CONTEXT.md`](../../context/BUSINESS_CONTEXT.md) +
   [`context/PRODUCT_CONTEXT.md`](../../context/PRODUCT_CONTEXT.md) — working context
4. [`rules/`](../../rules/) — hard rules · [`skills/`](../../skills/) — recipes ·
   [`docs/`](../) — deep reference (this page lives in [`docs/business/`](.))

Sibling business docs: [`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md),
[`BUSINESS_GOALS.md`](./BUSINESS_GOALS.md), [`TARGET_CUSTOMERS.md`](./TARGET_CUSTOMERS.md),
[`PERSONAS.md`](./PERSONAS.md), [`PAIN_POINTS.md`](./PAIN_POINTS.md),
[`USER_JOURNEYS.md`](./USER_JOURNEYS.md), [`MODULE_CATALOG.md`](./MODULE_CATALOG.md).

---

## The invariants every stage must hold

These do not "graduate" between stages — they are non-negotiable in **every**
environment and at **every** stage ([`AGENTS.md`](../../AGENTS.md) §6–8;
[`memory/SECURITY_MEMORY.md`](../../memory/SECURITY_MEMORY.md)). No commercial
milestone may trade them away:

- **Tenant isolation** — every tenant-owned query/`update`/`delete` is scoped by
  `tenantId`; no cross-tenant data, ever (`apps/api/CLAUDE.md` rules 8, 26).
- **RBAC** — every endpoint carries `@RequirePermission(...)`; never bypassed
  (`apps/api/CLAUDE.md` rule 25).
- **No auth / secret / permission bypass** — including dev; no fallback production
  secrets; connector credentials AES-256-GCM encrypted at rest
  (`apps/api/CLAUDE.md` rules 23, 24, 56).
- **AI approval-required for destructive actions** — a persisted `ApprovalRequest`
  is created **before** execution (`apps/api/CLAUDE.md` rule 97).
- **Never render raw AI output as HTML** — markdown or plain text only
  (`apps/web/CLAUDE.md` rule 43).
- **Engineering discipline** — no `any`; `pnpm` only; Node 22; the hard gates are
  `pnpm typecheck` and `pnpm build`, plus Docker image build, gitleaks, and CodeQL
  ([`AGENTS.md`](../../AGENTS.md) §4–5).

See [`rules/security/`](../../rules/security/), [`rules/ai/`](../../rules/ai/),
[`docs/SECURITY.md`](../SECURITY.md), and [`docs/AI.md`](../AI.md) for detail.

---

## Stage 1 — MVP (validated foundation) · delivered

**Business meaning:** a buildable, type-safe, one-command-installable platform with
a **live AI subsystem** — enough to demo end-to-end and onboard design partners.

**What "MVP" means here is the engineering Phase 1 + the AI subsystem that already
ships**, not a thin prototype. Per [`docs/ROADMAP.md`](../ROADMAP.md) Phase 1 and
[`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md):

- Unified pnpm + Turborepo monorepo; Node 22 LTS standardized (ADR-0002);
  `pnpm install` / `pnpm typecheck` / `pnpm build` green for both apps.
- A **shipping AI subsystem** — chat, findings, cross-chat memory, agents,
  orchestrator, investigation copilots, hunting ([`docs/AI.md`](../AI.md);
  `apps/web/CLAUDE.md` "AI Findings Page", "AI Chat Page").
- Whole-workflow SOC module coverage (alerts → cases → incidents → reports, plus
  hunts, intel, correlation, detection, normalization, SOAR, cloud security,
  compliance, vulnerabilities, attack paths, UEBA — see
  [`docs/business/MODULE_CATALOG.md`](./MODULE_CATALOG.md)).

**Commercial use:** design-partner demos and self-hosted pilots. Honest caveat —
AI **outcome quality is deployment-dependent** on which connectors are configured
and healthy ([`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)).

## Stage 2 — Beta (platform hardening) · delivered

**Business meaning:** a deployable, CI-gated, containerized platform that an early
customer can stand up — the basis for paid beta engagements.

Per [`docs/ROADMAP.md`](../ROADMAP.md) Phase 2 (validated in
[`docs/audit/FINAL_REPORT.md`](../audit/FINAL_REPORT.md) §8):

- **Docker** — workspace-aware `apps/web` / `apps/api` images (Node 22, non-root,
  healthchecks); unified compose under `infra/docker` with
  `dev`/`prod`/`infra`/`connectors` overlays; prod exposes only web (3000) and api
  (4000), Postgres/Redis internal.
- **CI/CD** — `.github/workflows`: `ci.yml` (typecheck + build hard gates;
  lint/format/test advisory), `security.yml` (gitleaks + Trivy fs + pnpm audit),
  `codeql.yml`, `dependency-review.yml`, `docker.yml`.
- **DX scripts** — `pnpm doctor`, `pnpm setup:env`, install scripts, CI helpers.
- **`@auraspear/ai`** scaffold (safety, redaction, model-router, evaluators,
  prompts) typechecks clean.

**Commercial use:** paid beta / early-access, self-hosted. There is **no managed
multi-region SaaS in-repo** — do not sell one ([`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)).

## Stage 3 — Enterprise (gated, production-grade) · next

**Business meaning:** the credibility bar for selling to security-mature buyers and
MSSPs — a clean, gated, production-grade baseline with real security-scan evidence.

This stage _is_ engineering Phase 3 ("Enterprise hardening"). It does not add new
product surfaces; it **closes hardening debt** so the platform is defensible in
procurement and security review. Tracked items (with status) live in
[`docs/ROADMAP.md`](../ROADMAP.md) Phase 3; highlights in business terms:

- **Contract consolidation into `@auraspear/shared`** — remove duplicated
  permissions/roles/enums/DTOs (reduces drift risk; done module-by-module with
  end-to-end validation).
- **`lint:strict` to zero** and **security scans run for real** (Trivy / gitleaks /
  CodeQL in GitHub Actions, findings triaged) — the evidence enterprise buyers ask
  for. Per [`AGENTS.md`](../../AGENTS.md) §5, **no security-scan claim is made until
  the workflows actually run.**
- **api image-size pruning**, **split boot-time migrate/seed**, **dependency audit
  & major upgrades**, **`packages/ui` extraction**.

**Commercial gate:** marketplace and broad GA are sequenced _behind_ this stage in
[`docs/ROADMAP.md`](../ROADMAP.md) — do not promise marketplace before enterprise
hardening lands.

## Stage 4 — Marketplace (extensible ecosystem) · planned

**Business meaning:** move from a hardened product to an **ecosystem** — a
third-party connector / playbook / detection-content marketplace, with revenue
share.

Per [`docs/ROADMAP.md`](../ROADMAP.md) Phase 5 and
[`docs/business/BUSINESS_GOALS.md`](./BUSINESS_GOALS.md) Goal 5, the **foundations
exist but the marketplace does not** — a repo search for "marketplace" hits only
docs and config, not a product surface. The substrate already in place:

- **Connector model** — per-type Zod-validated configs with AES-256-GCM-encrypted
  credentials and an `infra/docker` `connectors` overlay (`apps/api/CLAUDE.md`
  rule 39) → the structured, secure extension point.
- **Provider-agnostic router** — the AI cascade generalizes "pluggable backends"
  (`apps/web/CLAUDE.md` "AI Connector Strategy") → the pattern swappable
  marketplace content needs.
- **Job system** as the execution backbone (see SOC automation track below).

**Honest maturity:** planned, not shipped. Treat marketplace as the destination,
**gated behind Stage 3 (enterprise) and the AI-governance track.**

---

## Cross-cutting track A — Integrations

Integrations are not a single stage; they **deepen across every stage** and are the
"unify SOC tooling" promise ([`BUSINESS_GOALS.md`](./BUSINESS_GOALS.md) Goal 2).

- **Today (shipping):** the BFF is the single integration point — `apps/web` never
  calls downstream tools directly, it proxies through `apps/web/src/app/api/*` to
  `apps/api`. Connector types include `wazuh`, `graylog`, `logstash`,
  `velociraptor`, `grafana`, `influxdb`, `misp`, `shuffle`, `bedrock`, `llm_apis`,
  `openclaw_gateway` ([`MODULE_CATALOG.md`](./MODULE_CATALOG.md) §6). Built-in OSINT
  enrichment (VirusTotal, Shodan, AbuseIPDB, GreyNoise, URLScan, Censys, ThreatFox,
  Pulsedive + custom), all SSRF-validated with encrypted-at-rest keys.
- **Hardening (Stage 3):** every user-supplied connector URL is SSRF-validated at
  input time (`apps/api/CLAUDE.md` rule 59); connector mutation requires
  `TENANT_ADMIN` (rule 55). These are invariants, not roadmap items — maintain them.
- **Ecosystem (Stage 4):** the same connector model becomes the marketplace's
  publish/install substrate.

> Adding any integration/endpoint follows [`skills/backend/add-endpoint.md`](../../skills/backend/add-endpoint.md)
> and must ship the matching Next.js proxy route (`apps/web/CLAUDE.md` rule 33).

## Cross-cutting track B — AI governance

AI governance is engineering **Phase 4** and the trust differentiator
([`BUSINESS_GOALS.md`](./BUSINESS_GOALS.md) Goal 4). Split it into _enforced today_
vs _planned hardening_ — do not conflate them.

**Enforced today (invariants — see [`rules/ai/`](../../rules/ai/), [`docs/AI.md`](../AI.md)):**

- Provider-agnostic cascade (Bedrock → LLM APIs → OpenClaw Gateway → labeled
  `rule-based` fallback); no env-gated mock providers in production
  (`apps/api/CLAUDE.md` rules 88, 89).
- Destructive actions are `approval-required` with a persisted `ApprovalRequest`;
  every action is categorized `analysis-only` / `suggested` / `approval-required` /
  `auto-allowed` (`apps/api/CLAUDE.md` rule 97; `apps/web/CLAUDE.md` rules 44, 59).
- Provenance (provider/model/confidence) in the audit log; **raw AI output never
  rendered as HTML** (`apps/web/CLAUDE.md` rule 43).
- Tenant-scoped AI memory that must not store secrets; PII/secret redaction before
  model calls (`@auraspear/ai` `redact()`); per-agent token-quota checks
  (`apps/api/CLAUDE.md` rules 98–99).

**Planned hardening ([`docs/ROADMAP.md`](../ROADMAP.md) Phase 4):**

- Wire the **golden-dataset eval gate** (`@auraspear/ai/evaluators` `runEval()`)
  into CI as a regression gate; add a prompt-snapshot suite.
- **Per-tenant AI opt-in/out** toggle.
- **Per-tenant model/provider router UI** over the existing cascade.
- AI **outcome** expansion (case-timeline builder, explainable risk scoring at
  scale, SOAR playbook recommender, AI report writer) — expansion of the shipping
  subsystem, **not a rebuild**.

## Cross-cutting track C — SOC automation

SOC automation is the depth play under engineering **Phase 5**, built on the
existing job system rather than greenfield ([`docs/ROADMAP.md`](../ROADMAP.md)
Phase 5; `apps/web/CLAUDE.md` "Job Types & Handlers").

- **Already shipping:** registered handlers for `CONNECTOR_SYNC`,
  `DETECTION_RULE_EXECUTION`, `CORRELATION_RULE_EXECUTION`, `NORMALIZATION_PIPELINE`,
  `SOAR_PLAYBOOK`, `HUNT_EXECUTION`, `AI_AGENT_TASK`, `REPORT_GENERATION`, plus
  `MEMORY_EXTRACTION` — with the orchestrator's automation-mode / budget / approval
  validation.
- **Roadmap direction:** deepen automation breadth and reliability on this backbone.
- **Governance boundary (invariant):** automation never silently performs
  destructive security/infra actions — those stay `approval-required`
  ([`AGENTS.md`](../../AGENTS.md) §7; [`MODULE_CATALOG.md`](./MODULE_CATALOG.md)).
  This is also the bridge to **SOC2-style compliance automation**: the compliance
  module already tracks control status across ISO 27001, NIST, PCI-DSS, SOC2,
  HIPAA, and GDPR ([`MODULE_CATALOG.md`](./MODULE_CATALOG.md) §4), and every
  mutation is audit-logged — the evidence trail automation can build on.

---

## What we do not claim (anti-overstatement)

To keep this roadmap honest and aligned with [`docs/ROADMAP.md`](../ROADMAP.md):

- **No managed multi-region SaaS** in-repo — the model is self-hosted Docker
  ([`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)).
- **No marketplace product surface** today — foundations only
  ([`BUSINESS_GOALS.md`](./BUSINESS_GOALS.md) Goal 5).
- **No security-scan "pass" claimed** until Trivy / gitleaks / CodeQL actually run
  in CI ([`docs/ROADMAP.md`](../ROADMAP.md) "Known risks / caveats").
- **`lint:strict` is not yet green** (advisory in CI; tracked debt).
- AI outcome quality is **deployment-dependent** on configured connectors.

## Success signals by stage

| Stage                    | Business signals to track                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| MVP                      | demo completion end-to-end; design partners onboarded; AI subsystem usable per deployment                            |
| Beta                     | self-hosted installs that stand up cleanly; CI green on hard gates; first paid beta                                  |
| Enterprise               | security scans run + findings triaged; `lint:strict` to zero; procurement/security-review pass                       |
| AI governance            | approval-gated coverage (no destructive AI action without persisted approval); eval-gate pass rate once wired        |
| Marketplace / automation | installable connectors/playbooks/detection packs; automation breadth + reliability; compliance-evidence completeness |

## Where to go next

- **Engineering roadmap (canonical):** [`docs/ROADMAP.md`](../ROADMAP.md)
- Business goals & maturity: [`docs/business/BUSINESS_GOALS.md`](./BUSINESS_GOALS.md)
- One-page brief: [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)
- Modules (what's built): [`docs/business/MODULE_CATALOG.md`](./MODULE_CATALOG.md)
- Stable truths: [`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md) ·
  [`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md)
- AI / security deep dives: [`docs/AI.md`](../AI.md) · [`docs/SECURITY.md`](../SECURITY.md)
- Audit evidence: [`docs/audit/FINAL_REPORT.md`](../audit/FINAL_REPORT.md) ·
  [`docs/audit/02-risk-register.md`](../audit/02-risk-register.md)
- Docs index: [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md)

---

_Sources: [`AGENTS.md`](../../AGENTS.md), [`docs/ROADMAP.md`](../ROADMAP.md),
`apps/api/CLAUDE.md`, `apps/web/CLAUDE.md`,
[`docs/business/BUSINESS_GOALS.md`](./BUSINESS_GOALS.md),
[`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md),
[`docs/business/MODULE_CATALOG.md`](./MODULE_CATALOG.md),
[`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md), and
[`docs/audit/FINAL_REPORT.md`](../audit/FINAL_REPORT.md). This is a business
narrative over the engineering roadmap; delivered-vs-planned status is owned by
[`docs/ROADMAP.md`](../ROADMAP.md) and confirmed per-release against the code._
</content>
</invoke>
