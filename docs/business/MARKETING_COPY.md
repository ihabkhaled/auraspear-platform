# AuraSpear — Marketing Copy

> **AI agents and contributors: read [`AGENTS.md`](../../AGENTS.md) first.** It is
> the single entry point and defines the read-before-edit loading order, the
> security/AI invariants, and the command map. This file is **approved marketing
> copy**, not a source of truth. Positioning is grounded in
> [`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md), the one-liner in
> [`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md), the security/AI
> invariants in [`memory/SECURITY_MEMORY.md`](../../memory/SECURITY_MEMORY.md) and
> [`memory/AI_MEMORY.md`](../../memory/AI_MEMORY.md), and the module inventory in
> [`MODULE_CATALOG.md`](./MODULE_CATALOG.md). The deep product reference is
> [`docs/PRODUCT.md`](../PRODUCT.md).

## How to use this file

- **Source of truth precedence**: when this copy and the code/docs disagree, the
  code and the docs win. Re-derive before you ship a claim externally.
- **Do not invent metrics.** This repo ships no benchmark numbers (no "X% faster
  MTTR", no "N alerts/sec"). MTTR/alert-fatigue reduction is the **stated intent**
  ([`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md)), not a measured
  result. AI quality is **deployment-dependent** on which connectors are configured
  and healthy ([`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)).
- **Self-hosted, not SaaS.** The operational model is a Dockerized
  web + api + Postgres + Redis stack (`infra/docker`). There is **no managed
  multi-region SaaS offering in-repo** — do not market one.
- **Never claim a gate green without running it** ([`AGENTS.md`](../../AGENTS.md)
  §5). The same honesty rule applies to capability claims in copy: every concrete
  surface named here maps to a real module in [`MODULE_CATALOG.md`](./MODULE_CATALOG.md).

---

## Official positioning sentence

> **AuraSpear is an AI-first SOC platform that unifies SIEM alerts, cases, threat
> hunting, intelligence enrichment, SOAR automation, and AI investigation workflows
> in a multi-tenant workspace built for modern security teams and MSSPs.**

This is the canonical sentence from [`AGENTS.md`](../../AGENTS.md) §2 (and the
one-liner in [`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md)). Use it
verbatim for headers, decks, and meta descriptions. Do not paraphrase it into new
claims.

---

## One-liner

**AI-first SOC, end to end — alerts to reports, woven with auditable AI, in one
multi-tenant workspace.**

Alternates (same meaning, different length budget):

- **Tweet-length**: The whole SOC workflow in one governed workspace, with AI woven
  into every investigation.
- **Tagline**: One SOC. Every workflow. AI you can audit.

## Short pitch (≈50 words)

AuraSpear is an AI-first SOC platform that unifies SIEM alerts, cases, incidents,
threat hunting, intel/IOC enrichment, SOAR automation, detection engineering, cloud
security, and compliance into one multi-tenant, RBAC-governed workspace. AI is woven
through investigation — not bolted on as a chatbot — and stays auditable and
approval-gated. Built for SOC teams and MSSPs.

## Long pitch (≈180 words)

Security teams drown in alerts while their tooling stays fragmented across point
products. AuraSpear answers that with an **AI-first SOC platform**: alerts → cases →
incidents → reports, plus threat hunting, threat-intelligence and IOC enrichment,
correlation, detection engineering, log normalization, SOAR playbooks, cloud security
across AWS/Azure/GCP/OCI, compliance, vulnerabilities, attack paths, and UEBA — all
in **one multi-tenant, RBAC-governed workspace**.

The difference is _where the AI lives_. Instead of one generic chatbot, AuraSpear
weaves a fleet of purpose-built agents and an orchestrator into the point of work:
alert triage, IOC enrichment, case timelines, Sigma drafting, vuln prioritization,
attack-path summaries, and reporting. AI routing is **provider-agnostic** — a cascade
across AWS Bedrock, OpenAI-compatible LLM APIs, and an OpenClaw Gateway — so you are
not locked to one vendor.

And it is **governed by construction**: strict tenant isolation, dynamic
`@RequirePermission` RBAC, AES-256-GCM-encrypted connector secrets, SSRF-validated
URLs, JWT rotation with a Redis-backed blacklist, and full audit logging.
Destructive AI actions are approval-required, every AI output is attributable, and
raw AI output is never rendered as HTML.

It is self-hosted via Docker — web + API + Postgres + Redis. Built for in-house SOC
teams, MSSPs/MDR providers, IR, compliance, cloud security, and lean security teams.

---

## Features

Each feature maps to a real module — see [`MODULE_CATALOG.md`](./MODULE_CATALOG.md)
for the backend path, permissions, and AI agent behind it.

- **End-to-end SOC workflow in one workspace** — alerts → cases → incidents →
  reports, with notes, tasks, artifacts, timelines, and linked alerts on cases.
  (`alerts`, `cases`, `incidents`, `reports`.)
- **Threat hunting with a guarded run lifecycle** — hunt runs follow a strict
  `running → completed | error` state machine. (`hunts`, `threat_hunter` agent.)
- **Detection engineering** — rule CRUD plus an executor that creates alerts on
  match; threshold/anomaly/chain/scheduled rule types, with an AI Detection Copilot
  and Sigma-drafting assist. (`detection-rules`, `correlation`, `normalization`.)
- **Threat intelligence & built-in OSINT enrichment** — MISP IOC matching plus
  built-in sources (VirusTotal, Shodan, AbuseIPDB, GreyNoise, URLScan, Censys,
  ThreatFox, Pulsedive, and more) with SSRF-validated URLs and encrypted-at-rest API
  keys. (`intel`, `osint-executor`.)
- **SOAR automation** — playbooks and runbooks integrated with the Shuffle
  connector; destructive automation is approval-required. (`soar`, `runbooks`.)
- **Posture, risk & compliance** — vulnerabilities with patch tracking, multi-cloud
  security findings, compliance control status across ISO 27001 / NIST / PCI-DSS /
  SOC 2 / HIPAA / GDPR, attack paths, entities, and UEBA. (`vulnerabilities`,
  `cloud-security`, `compliance`, `attack-paths`, `entities`, `ueba`.)
- **AI-native surfaces** — `ai-chat` with cross-chat memory, a searchable
  `ai-findings` workspace (PostgreSQL full-text search), an agent graph, and
  governance views (`ai-finops`, `ai-eval`, `ai-ops`, `ai-simulations`). (`ai`,
  `ai-agents`, `agent-config`.)
- **Connector-driven integration** — a single BFF integration point for Wazuh,
  Graylog, Logstash, Velociraptor, Grafana, InfluxDB, MISP, Shuffle, and AI
  providers; per-type Zod config validation. (`connectors`.)
- **MSSP-grade multi-tenancy** — every query is `tenantId`-scoped; admins switch
  tenant context via `X-Tenant-Id`; a cross-tenant MSSP dashboard view.
  (`tenants`, `dashboards/mssp`.)
- **Dynamic RBAC & identity** — OIDC (Microsoft Entra ID) plus email/password,
  per-tenant dynamic permissions, soft-delete/block/restore user lifecycle, and
  protected admin accounts. (`auth`, `role-settings`, `tenants`.)
- **Operations & observability** — an async job queue with auto-recovery of stale
  jobs, WebSocket notifications, health checks, and a full mutation audit trail.
  (`jobs`, `notifications`, `health`, `audit-logs`.)

## Differentiators

Grounded in [`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md) and
[`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md):

1. **AI woven through investigation, not bolted on.** A fleet of 20+ purpose-built
   agents plus an orchestrator works at the point of work — not one generic
   assistant.
2. **Provider-agnostic AI cascade.** Routing tries every configured connector in
   order (Bedrock → LLM APIs → OpenClaw Gateway) and falls back to a clearly-labeled
   `rule-based` response only when none are available. No single-vendor lock-in.
3. **Auditable, approval-gated AI.** Destructive actions create a persisted
   `ApprovalRequest` before execution; every output carries provenance
   (provider/model/confidence) and citations where applicable.
4. **Multi-tenant by design.** Tenant isolation is a hard invariant, making one
   governed pane of glass across many customer environments the default, not an
   add-on — ideal for MSSPs.
5. **End-to-end SOC coverage in one workspace.** Alerts → cases → incidents →
   reports plus hunts, intel, detection, SOAR, cloud, and compliance — fewer point
   tools to stitch together.
6. **Governed by construction.** Dynamic `@RequirePermission` RBAC, AES-256-GCM
   secret encryption, SSRF validation, and full audit logging are platform
   invariants — not configuration you can forget to turn on.

---

## Security statement

AuraSpear is **secure by construction**, not by checklist. These are enforced
platform invariants (see [`AGENTS.md`](../../AGENTS.md) §6,
[`memory/SECURITY_MEMORY.md`](../../memory/SECURITY_MEMORY.md), and
[`docs/SECURITY.md`](../SECURITY.md)):

- **Tenant isolation** — every tenant-owned query, update, and delete is scoped by
  `tenantId`. No cross-tenant data, ever.
- **Dynamic RBAC** — every endpoint carries `@RequirePermission(...)`; permissions
  are dynamic and stored per tenant, enforced through an Auth → Tenant → Permissions
  guard chain.
- **No auth bypass, anywhere** — OIDC (Microsoft Entra ID) plus email/password, with
  short-lived access tokens, refresh-token rotation, and a Redis-backed JTI
  blacklist. No dev shortcuts in any environment.
- **Secrets protected** — connector credentials are AES-256-GCM encrypted at rest;
  only `*.example` env files are committed; there are no fallback production secrets.
- **Hardened by default** — Helmet with explicit CSP, strict CORS, SSRF validation
  on user-supplied URLs, request size limits, rate-limit tiers, and no version or
  internal-URL disclosure.
- **Auditable** — mutations are audit-logged with credentials redacted from logs.
- **Verified continuously** — gitleaks, Trivy, `pnpm audit`, and CodeQL run as scan
  gates (see [`docs/security/`](../security/)). We do not claim a gate green without
  running it.

## AI statement

AuraSpear's AI is **assistive and accountable** (see
[`AGENTS.md`](../../AGENTS.md) §7, [`memory/AI_MEMORY.md`](../../memory/AI_MEMORY.md),
and [`docs/AI.md`](../AI.md)):

- **AI analyzes and suggests; it does not silently act.** Destructive or high-risk
  security/infrastructure actions are **approval-required** and create a persisted
  `ApprovalRequest` — plus the right permission — before anything runs. Every action
  is categorized: `analysis-only`, `suggested`, `approval-required`, or
  `auto-allowed`.
- **Every AI output is attributable.** Outputs carry provenance — provider, model,
  confidence, prompt version, token usage — and citations where applicable. The UI
  always shows loading, error, confidence, and provider state with a regenerate
  affordance.
- **Raw AI output is never rendered as HTML.** It is rendered as safe markdown or
  plain text, through standardized renderer components.
- **Privacy by redaction.** PII and secrets are stripped before any model call and
  before transcripts are persisted. AI memory is tenant-scoped and stores no secrets.
- **Provider-agnostic, no lock-in.** A connector cascade (Bedrock → LLM APIs →
  OpenClaw Gateway) means you choose the model; if none are configured, AuraSpear
  falls back to a clearly-labeled rule-based response. **AI quality is therefore
  deployment-dependent.**
- **Evaluated and governed.** A golden-case evaluation harness backs AI quality,
  per-agent token budgets cap spend, and safety assertions fail a run regardless of
  pass rate.

---

## Where to go next

- One-page positioning: [`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md) · module inventory:
  [`MODULE_CATALOG.md`](./MODULE_CATALOG.md) · buyers:
  [`TARGET_CUSTOMERS.md`](./TARGET_CUSTOMERS.md) · personas:
  [`PERSONAS.md`](./PERSONAS.md) · goals: [`BUSINESS_GOALS.md`](./BUSINESS_GOALS.md)
  · pain points: [`PAIN_POINTS.md`](./PAIN_POINTS.md) · journeys:
  [`USER_JOURNEYS.md`](./USER_JOURNEYS.md)
- Deep product reference: [`docs/PRODUCT.md`](../PRODUCT.md) · demo script:
  [`docs/DEMO.md`](../DEMO.md)
- Security & AI deep dives: [`docs/SECURITY.md`](../SECURITY.md) (+
  [`docs/security/`](../security/)) · [`docs/AI.md`](../AI.md) (+
  [`docs/ai/`](../ai/))
- Onboarding entry point: [`AGENTS.md`](../../AGENTS.md) · docs index:
  [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md)
- Hard rules: [`rules/`](../../rules/) · Recipes: [`skills/`](../../skills/) ·
  Stable memory: [`memory/`](../../memory/) · Working context:
  [`context/`](../../context/)

---

_Sources: [`AGENTS.md`](../../AGENTS.md) §2/§6/§7,
[`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md),
[`memory/SECURITY_MEMORY.md`](../../memory/SECURITY_MEMORY.md),
[`memory/AI_MEMORY.md`](../../memory/AI_MEMORY.md),
[`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md),
[`docs/business/MODULE_CATALOG.md`](./MODULE_CATALOG.md),
[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md),
[`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md). This is approved copy, not a
maturity claim; re-derive every external claim against the code per release._
