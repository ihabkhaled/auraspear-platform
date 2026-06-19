# BUSINESS_CONTEXT — AuraSpear platform

> **Read [`AGENTS.md`](../AGENTS.md) first.** It is the single AI entry point and
> defines the loading order: `AGENTS.md` → `memory/*.md` → `context/*.md` (this
> file) → `rules/**` → `skills/**` → `docs/**` → code. Do not edit first and
> understand later.

This is the **business onboarding** file. It explains _who_ AuraSpear is for and
_why_ it exists, so that any change you make stays aligned with the product. It
is not a code spec — for technical onboarding read the sibling `context/*.md`
files and the area `rules/**` before editing.

---

## What this area is

**AuraSpear is an AI-first SOC platform** that unifies SIEM alerts, cases,
incidents, threat hunting, threat-intelligence enrichment, SOAR automation,
detection engineering, cloud security, and compliance into one **multi-tenant**,
RBAC-governed workspace — with AI reasoning woven through the investigation
lifecycle rather than bolted on as a chatbot
(`memory/BUSINESS_MEMORY.md`, `docs/PRODUCT.md`, `AGENTS.md` §2).

**Customers / primary buyers** (`docs/PRODUCT.md` §2):

- **MSSPs / MDR providers** — multi-tenancy is core; one pane of glass across
  many customer environments (every query is `tenantId`-scoped;
  `GLOBAL_ADMIN`/`PLATFORM_OPERATOR` switch tenant via `X-Tenant-Id`).
- **In-house SOC teams** — full alert → case → incident → report workflow.
- **Incident response (IR) teams** — cases with tasks, artifacts, timelines.
- **Compliance / GRC teams** — control status across ISO 27001, NIST, PCI-DSS,
  SOC2, HIPAA, GDPR; full audit logging.
- **Cloud security teams** — AWS / Azure / GCP / OCI accounts and findings.
- **Lean security startups** — stand up a SOC without building integrations.

**Personas** map to the backend `UserRole` hierarchy (most → least privileged):
`GLOBAL_ADMIN`, `PLATFORM_OPERATOR`, `TENANT_ADMIN`, `SOC_ANALYST_L2`,
`THREAT_HUNTER`, `SOC_ANALYST_L1`, `EXECUTIVE_READONLY`
(`apps/api/src/modules/role-settings/constants/default-permissions.ts`). Product
personas: global/platform admin, tenant admin, SOC manager, Tier-1 / Tier-2
analyst, threat hunter, detection engineer, incident commander, compliance
officer, cloud security engineer, executive read-only. Full mapping table:
`docs/PRODUCT.md` §5.

**Value proposition** (`docs/PRODUCT.md` §3, `memory/BUSINESS_MEMORY.md`):

1. AI woven into the workflow (triage, enrichment, timelines, Sigma drafting,
   reporting) via 20+ purpose-built agents + an orchestrator — not one generic
   chatbot.
2. One multi-tenant workspace for the whole SOC.
3. Provider-agnostic AI cascade (Bedrock → LLM APIs → OpenClaw Gateway) with a
   clearly-labeled `rule-based` fallback — no AI vendor lock-in.
4. Safety and governance first: approval-gated AI actions, per-agent budgets,
   categorized AI actions, full audit logging.
5. Security-hardened by construction: tenant isolation, `@RequirePermission`
   RBAC, AES-256-GCM secrets, SSRF validation, JWT rotation + Redis blacklist.
6. Connector-driven BFF — the web app never touches Wazuh/OpenSearch/MISP/Shuffle
   directly.

> **Why this matters for code changes:** business decisions are encoded as hard
> invariants. A feature that leaks cross-tenant data, skips an approval, or
> renders raw AI HTML breaks the product promise, not just a test.

---

## Where files live

Business material is documentation, not application code. Locations:

- **Stable business truths** — `memory/BUSINESS_MEMORY.md` (one-liner, buyers,
  personas, differentiators). Read this before this file's deep docs.
- **Deep product narrative** — `docs/PRODUCT.md` (customers, value prop,
  personas, workflows, product gaps), grounded in real modules/routes.
- **Demo / story flow** — `docs/DEMO.md`.
- **Roadmap** — `docs/ROADMAP.md`.
- **`docs/business/`** — reserved for deep business detail; currently **empty
  scaffold**. Add new long-form business docs here and link them from
  `docs/DOCS_INDEX.md`; keep `memory/BUSINESS_MEMORY.md` as the short summary.
- **Where the business shows up in code** (do not duplicate truths here, link
  them): roles/permissions in `apps/api/src/common/enums/` (e.g.
  `permission.enum.ts`) and `apps/api/src/modules/role-settings/`; domain modules
  in `apps/api/src/modules/*`; SOC console routes in
  `apps/web/src/app/(portal)/*`; AI agents in
  `apps/api/src/common/enums/ai-agent-config.enum.ts`.

---

## What rules apply (link `rules/`)

Always load the **global** rules, then the **area** rules for your task
(`AGENTS.md` §10). Business-relevant invariants:

- [`rules/global/absolute-rules.md`](../rules/global/absolute-rules.md) — the
  non-negotiables (no `any`, pnpm only, Node 22, never claim a gate green without
  running it).
- [`rules/global/validation-gates.md`](../rules/global/validation-gates.md),
  [`rules/global/branch-safety.md`](../rules/global/branch-safety.md),
  [`rules/global/repo-navigation.md`](../rules/global/repo-navigation.md).
- [`rules/security/security-rules.md`](../rules/security/security-rules.md),
  [`rules/security/secret-handling.md`](../rules/security/secret-handling.md) —
  **tenant isolation**, **RBAC (`@RequirePermission`)**, no auth/secret/permission
  bypass, encrypted connector credentials. These _are_ the MSSP business model.
- [`rules/ai/ai-approval-rules.md`](../rules/ai/ai-approval-rules.md),
  [`rules/ai/ai-output-rules.md`](../rules/ai/ai-output-rules.md),
  [`rules/ai/ai-governance.md`](../rules/ai/ai-governance.md) — **AI
  approval-required for destructive actions**, **never render raw AI HTML**,
  provenance/citations, tenant-scoped AI memory with no secrets.
- [`rules/backend/tenant-permission-rules.md`](../rules/backend/tenant-permission-rules.md) —
  every tenant-owned query/`update`/`delete` is scoped by `tenantId`.
- [`rules/docs/documentation-rules.md`](../rules/docs/documentation-rules.md),
  [`rules/docs/adr-rules.md`](../rules/docs/adr-rules.md) — how to write/structure
  these docs and record decisions.

Full area indexes: `rules/frontend/`, `rules/backend/`, `rules/security/`,
`rules/ai/`, `rules/testing/`, `rules/docs/`.

---

## What skills apply (link `skills/`)

Skills are step-by-step recipes (`AGENTS.md` §10–11). For changes that touch
business docs/positioning:

- [`skills/docs/update-docs.md`](../skills/docs/update-docs.md) — update product
  / business docs and keep `docs/DOCS_INDEX.md` and `memory/BUSINESS_MEMORY.md`
  in sync.
- [`skills/docs/add-adr.md`](../skills/docs/add-adr.md) — record a business or
  architectural decision as an ADR in `docs/decisions/`.

When a business need turns into a feature, the implementation skill belongs to
its area, e.g. [`skills/backend/add-permission.md`](../skills/backend/add-permission.md)
(a new business capability is usually a new permission added end-to-end),
[`skills/ai/add-ai-feature.md`](../skills/ai/add-ai-feature.md),
[`skills/frontend/add-page.md`](../skills/frontend/add-page.md). Full sets:
`skills/frontend/`, `skills/backend/`, `skills/ai/`, `skills/devsecops/`,
`skills/qa/`, `skills/docs/`.

---

## What docs to read

In order of depth:

1. [`memory/BUSINESS_MEMORY.md`](../memory/BUSINESS_MEMORY.md) — the 30-second
   business summary.
2. [`docs/PRODUCT.md`](../docs/PRODUCT.md) — customers, value prop, personas,
   workflows, product gaps (the authoritative business narrative).
3. [`docs/DEMO.md`](../docs/DEMO.md) — the demo story / end-to-end flow.
4. [`docs/ROADMAP.md`](../docs/ROADMAP.md) — direction and priorities.
5. [`docs/DOCS_INDEX.md`](../docs/DOCS_INDEX.md) — central index to everything
   else (architecture, AI, security, environment, tools, decisions).
6. `docs/business/` — deep business detail (scaffold; populate as it grows).

Cross-area context lives in sibling files: other `context/*.md`, plus
`memory/PROJECT_MEMORY.md` and `memory/AI_MEMORY.md`.

---

## Common mistakes

- **Inventing business claims.** Every persona, customer segment, and feature in
  this repo is grounded in real modules/routes/enums (`docs/PRODUCT.md`
  "Sources"). Do not add markets, integrations, or "managed SaaS" claims the code
  does not support — the in-repo model is a self-hosted Docker stack
  (`docs/PRODUCT.md` §7).
- **Overstating AI maturity.** AI richness is **deployment-dependent**: with no
  Bedrock/LLM/OpenClaw connector configured, AI features fall back to a
  `rule-based` response. Several AI governance surfaces (`ai-eval`, `ai-finops`,
  `ai-simulations`, `ai-rag`, `ai-handoffs`) exist as pages but maturity varies
  per release. State this conservatively.
- **Letting business "convenience" weaken an invariant.** No cross-tenant data,
  no auth/permission bypass, no auto-executed destructive AI action, no raw AI
  HTML — even when a demo or customer "would like it." These are product, legal,
  and security commitments.
- **Treating roles as the access model.** Granular access is governed by the
  **dynamic, database-backed permission system**, not role alone. A new business
  capability means a new permission added end-to-end (backend enum →
  definitions → defaults → `@RequirePermission` → migration → frontend mirror →
  proxy route → i18n in all 6 locales → seed), per `apps/api/CLAUDE.md` rule 85.
- **Duplicating truths.** Keep the short summary in `memory/BUSINESS_MEMORY.md`,
  the narrative in `docs/PRODUCT.md`, and pointers (not copies) here. Update all
  three together when business facts change.
- **Forgetting i18n.** User-facing business text in `apps/web` must go through
  `t()` and exist in all 6 locales (`en`, `es`, `it`, `fr`, `ar`, `de`).

---

## Validation commands

This file is documentation, so the relevant gates are formatting/link hygiene and
the standard repo gates (run from repo root, **pnpm only, Node 22**;
`AGENTS.md` §4–5):

```bash
pnpm format:check        # Prettier — verifies this Markdown is formatted
pnpm format              # auto-format if format:check fails
pnpm doctor              # environment sanity (Node 22, pnpm, toolchain)
```

If your change also touched code (e.g. a new permission or AI surface driven by a
business need), run the **hard gates** before claiming green:

```bash
pnpm typecheck           # blocking
pnpm build               # blocking
pnpm validate            # typecheck + lint:strict + format:check
pnpm scan:secrets        # gitleaks — no committed secrets
```

> **Never claim a gate is green without running it** (`AGENTS.md` §5, §13). Do
> not say "all green" unless every required gate actually passed. Full command
> list: `memory/COMMANDS_MEMORY.md`.
