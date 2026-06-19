# SECURITY_CONTEXT.md — AuraSpear security (tenancy, RBAC, auth, secrets, scans)

> **Read [`../AGENTS.md`](../AGENTS.md) FIRST.** It is the single AI entry point
> and defines the loading order: `AGENTS.md` → `memory/*.md` → this `context/*.md`
> → `rules/**` → `skills/**` → `docs/**` → code + tests. This file is step 3 for
> any task that touches authentication, authorization, tenant isolation, secrets,
> connector credentials, SSRF, or the security scans. Do **not** edit before you
> have read the linked rules and skills — _no AI agent may edit first and
> understand later_. Where this file and a `CLAUDE.md` rule number overlap, **the
> `CLAUDE.md` rule number is authoritative**.

This is the **security orientation** file: the trust boundary, the invariants,
and where each control lives. The exhaustive source of truth is
[`../rules/security/`](../rules/security/) (the consolidated hard constraints) and
[`../apps/api/CLAUDE.md`](../apps/api/CLAUDE.md) (100+ enforced rules + the
"Security Architecture (Post-Audit)" / "Token Lifecycle" sections).

---

## What this area is

AuraSpear is a **multi-tenant SOC Backend-for-Frontend (BFF)**: a NestJS 11 API
(`apps/api`, `@auraspear/api`) fronted by a Next.js proxy (`apps/web`,
`@auraspear/web`). The web app **never** calls Wazuh / OpenSearch / MISP /
Shuffle / Bedrock / the DB directly — it proxies every call through
`apps/web/src/app/api/*` routes (`proxyToBackend()`) to the API. That makes the
**API the entire trust boundary**: every authentication, authorization, tenant,
and outbound-call decision is the API's job. The guards, `apps/api/src/main.ts`,
and `apps/api/src/config/env.validation.ts` _are_ that boundary — do not weaken
them.

Security here is not advisory. Each invariant maps to real code, and violating
one is a **cross-tenant breach, privilege escalation, token replay, credential
leak, or SSRF** — not a style nit.

The **non-negotiable invariants** (from [`../AGENTS.md`](../AGENTS.md) §6–§7):

- **Tenant isolation** — every tenant-owned `findMany`/`findFirst`/`update`/
  `delete` is scoped by `tenantId`. `update`/`delete` use a compound
  `where: { id, tenantId }` (via `updateMany`/`deleteMany`), **never `id` alone**
  (`apps/api/CLAUDE.md` #8/#26). Sub-resources validate parent ownership first
  (#75). No cross-tenant data, ever.
- **RBAC** — every endpoint carries `@RequirePermission(Permission.MODULE_ACTION)`
  (#25). **A missing decorator fails OPEN** in `PermissionsGuard` — a silent auth
  hole — so every endpoint needs one (or `@Public()` + a documented reason).
  `GLOBAL_ADMIN` bypass lives in **one place** (the guard) — never replicate a
  role check into a service/repo/utility.
- **No auth / secret / permission bypass in any environment** — no `NODE_ENV`
  shortcuts, no dev fake-user, no skipping JWT verification (#23/#56). Secrets are
  env-loaded with **no fallbacks** (#24/#53/#54). Never trust client-supplied
  identity — role and tenant come from the validated JWT only; no `X-Role`
  forwarding (#76).
- **AI safety** — AI may analyze and suggest, but **destructive AI actions are
  approval-required**: persist an `ApprovalRequest` before executing (#97).
  **Never render raw AI output as HTML** (`apps/web/CLAUDE.md` #43; `react/no-danger`
  is an ESLint error). Redact PII/secrets before model calls; AI memory is
  tenant-scoped and stores no secrets.
- **Engineering invariants** — no `any`, no `eslint-disable`/`@ts-ignore`, **pnpm
  only, Node 22**. Branch first — never work on `main`. Never claim a gate green
  without running it.

---

## Where files live

**The trust boundary (`apps/api`):**

- **Global guard chain** — registered as `APP_GUARD` in
  `apps/api/src/app.module.ts`, runs in this order on every non-`@Public()`
  request (you do **not** add `@UseGuards(...)` to get them):

  ```
  ThrottlerGuard → AuthGuard → CsrfGuard → TenantGuard → RolesGuard → PermissionsGuard
  ```

  - `common/guards/auth.guard.ts` — extracts the token (Bearer header, then
    HttpOnly `access_token` cookie), verifies it, pins `tokenType === 'access'`,
    runs `validateUserActive(sub)` (rejects inactive/suspended/deleted users 401),
    builds `request.user`.
  - `common/guards/csrf.guard.ts` — cookie-backed state-changing requests need a
    matching `csrf_token` cookie + header, compared with `timingSafeEqual`.
  - `common/guards/tenant.guard.ts` — 403 `errors.auth.tenantRequired` if no tenant.
  - `common/guards/permissions.guard.ts` — reads `@RequirePermission` metadata,
    checks the DB-backed role→permission set; **multiple permissions = AND**;
    `GLOBAL_ADMIN` bypass is hard-coded here only.

- **Auth + tokens** — `apps/api/src/modules/auth/auth.service.ts` (login, refresh,
  HS256 signing/verify, bcrypt) + `auth/token-blacklist.service.ts` (Redis-backed
  `jti` blacklist + refresh-family tracking).
- **Decorators** (`common/decorators/`): `@RequirePermission`
  (`permission.decorator.ts`), `@TenantId`, `@CurrentUser`, `@Public`, `@Roles`
  (legacy — retained on `role-settings` and connector mutations), `@SkipCsrf`.
- **Permissions model** — `common/enums/permission.enum.ts` (the `Permission`
  enum) + `permission-definitions.ts` + `default-permissions.ts`; persisted per
  tenant in Postgres (compound unique key `(tenantId, key)`).
- **Secrets & crypto** — `common/utils/encryption.utility.ts` (AES-256-GCM at rest
  for connector configs + OSINT keys), `common/utils/ssrf.utility.ts`
  (`validateUrl()` / `resolveAndValidateUrl()` + `ssrf.constants.ts` private-host
  patterns), `common/utils/redaction.*` (`SENSITIVE_KEYS`),
  `common/utils/es-sanitize.utility.ts` (`sanitizeEsQueryString()`).
- **HTTP hardening** — `apps/api/src/main.ts` (Helmet + CSP, HSTS, CORS via
  `new URL()`, 1MB body limit, `Cache-Control: no-store`, dev-only Swagger).
- **Audit + error sanitization** — `common/interceptors/audit.interceptor.ts`
  (mutations → `auditLog`, credentials redacted) and
  `common/filters/http-exception.filter.ts` (the `GlobalExceptionFilter` that
  strips paths/Prisma metadata/stack traces and attaches `messageKey`).
- **Boot-time secret validation** — `apps/api/src/config/env.validation.ts` (Zod
  env schema: rejects all-zero `JWT_SECRET`/`CONFIG_ENCRYPTION_KEY`, no-fallback
  secrets, `NODE_ENV` defaults to `production`, no `localhost` CORS in prod).

**The proxy boundary (`apps/web`):** `apps/web/next.config.ts` sets security
headers (X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy,
Permissions-Policy). `proxyToBackend()` must **not** forward auth/role headers
(`apps/web/CLAUDE.md` #41). OSINT URL pre-validation: `isAllowedSourceUrl()` from
`@/lib/source.utils.ts` (UX only — the backend `validateUrl()` is authoritative).

**Scans config:** `package.json` scripts (`audit:security`, `scan:trivy`,
`scan:secrets`) and `.github/workflows/` (`security.yml`, `codeql.yml`,
`dependency-review.yml`, `docker.yml`).

---

## What rules apply (read before editing)

Always load `rules/global/*`, then the **security** area rules in
[`../rules/security/`](../rules/security/):

- [`security-rules.md`](../rules/security/security-rules.md) — the consolidated
  hard constraints: tenant isolation, RBAC + the fail-open default, the guard
  chain, token lifecycle, bcrypt constant-time login, Helmet/CSP, strict CORS,
  SSRF, audit/redaction, error sanitization, secrets/encryption, the AI boundary,
  and a pre-commit checklist. **Start here.**
- [`secret-handling.md`](../rules/security/secret-handling.md) — env secrets,
  no-fallback / no-all-zeros refines, `.env.example` discipline, connector
  encryption.
- [`ai-security.md`](../rules/security/ai-security.md) — AI-specific security cuts
  (redaction before model calls, approval-required destructive actions, no raw
  HTML).
- [`dependency-audit.md`](../rules/security/dependency-audit.md) — dependency
  vulnerability policy (patch/minor first, majors via ADR, record exceptions).
- [`docker-security.md`](../rules/security/docker-security.md) — no internal
  service ports exposed in prod compose, image hardening.

Cross-area depth:
[`../rules/backend/tenant-permission-rules.md`](../rules/backend/tenant-permission-rules.md)
(guard chain, tenant scoping, RBAC, GLOBAL_ADMIN, the end-to-end permission
change),
[`../rules/backend/dto-validation-rules.md`](../rules/backend/dto-validation-rules.md)
(Zod `.max()` / nested-JSON caps — the DoS surface that runs _before_ the
guards), and [`../rules/ai/`](../rules/ai/) (`ai-approval-rules.md`,
`ai-output-rules.md`, `ai-memory-rules.md`, `ai-governance.md`). Always also load
[`../rules/global/absolute-rules.md`](../rules/global/absolute-rules.md),
[`branch-safety.md`](../rules/global/branch-safety.md), and
[`validation-gates.md`](../rules/global/validation-gates.md).

---

## What skills apply (recipes for the work)

Match your task to a recipe (each opens with "Read `AGENTS.md` first"):

- Run a security scan →
  [`../skills/devsecops/run-security-scan.md`](../skills/devsecops/run-security-scan.md)
- Add an env variable / secret (env schema + `.env.example` + Docker + docs) →
  [`../skills/devsecops/add-env-variable.md`](../skills/devsecops/add-env-variable.md)
- Add a CI gate →
  [`../skills/devsecops/add-ci-gate.md`](../skills/devsecops/add-ci-gate.md)
- Upgrade a dependency (incl. security patches) →
  [`../skills/devsecops/upgrade-dependency.md`](../skills/devsecops/upgrade-dependency.md)
- Add a permission **end-to-end** (backend enum → definitions → defaults →
  `@RequirePermission` → migration → web mirror → proxy → i18n ×6 → seed) →
  [`../skills/backend/add-permission.md`](../skills/backend/add-permission.md)
- Add an endpoint (with `@RequirePermission` + tenant scoping) →
  [`../skills/backend/add-endpoint.md`](../skills/backend/add-endpoint.md)
- Add a connector type (validated config + encrypted credentials + SSRF) →
  [`../skills/backend/add-connector.md`](../skills/backend/add-connector.md)
- Add an AI feature with an approval-required action →
  [`../skills/ai/add-ai-feature.md`](../skills/ai/add-ai-feature.md)
- Validate before shipping →
  [`../skills/qa/validate-release.md`](../skills/qa/validate-release.md)

---

## What docs to read

- [`../docs/SECURITY.md`](../docs/SECURITY.md) (+ [`../docs/security/`](../docs/security/)) —
  the security architecture: `THREAT_MODEL.md`, `SECRET_HANDLING.md`,
  `SECURITY_SCANS.md`, `VULNERABILITY_MANAGEMENT.md`.
- [`../apps/api/CLAUDE.md`](../apps/api/CLAUDE.md) — **authoritative** backend rule
  list (#8, #23–#66, #75–#84, #95–#97) + "Security Architecture (Post-Audit)" +
  "Token Lifecycle".
- [`../apps/web/CLAUDE.md`](../apps/web/CLAUDE.md) — frontend "Security Rules"
  (#35–#41), #43 (no raw AI HTML), #46 (no AI in localStorage), #54 (OSINT SSRF).
- [`../memory/SECURITY_MEMORY.md`](../memory/SECURITY_MEMORY.md) — stable security
  truths and decisions; [`../memory/DECISIONS_MEMORY.md`](../memory/DECISIONS_MEMORY.md)
  for the rationale (ADRs).
- [`../docs/audit/`](../docs/audit/) — risk register + vulnerability remediation
  (the live finding count and plan).

---

## Common mistakes

- **`where: { id }` without `tenantId`** on a tenant-owned model — a cross-tenant
  read/write. Always `{ id, tenantId }` (`apps/api/CLAUDE.md` #26). A bare
  `findUnique({ where: { id } })` is a review blocker unless the row is genuinely
  global. Sub-resources must validate parent ownership first (#75).
- **Endpoint with no `@RequirePermission`** — `PermissionsGuard` **lets it
  through** (fails open). Add the decorator, or `@Public()` + document why.
- **Leaking a `GLOBAL_ADMIN` / role check into a service or repo** —
  authorization stays in the guard; spreading it duplicates the trust boundary.
- **Adding a permission partially** — it must land in **one** change (enum →
  definitions → defaults → decorator → migration via `WHERE NOT EXISTS`, never
  `ON CONFLICT ("key")` → web enum mirror → proxy route → i18n ×6 → seed). See
  `add-permission.md`.
- **`NODE_ENV`-gated security** — `if (NODE_ENV === 'development') { skip }` for
  auth, SSRF, HTTPS enforcement, or AI enablement is banned (#56). Use test
  fixtures / DI, not runtime env checks.
- **Trusting client identity** — never read a role from a body/header; never
  forward `X-Role` even in dev (#76). The only honored client header is
  `X-Tenant-Id`, resolved server-side and only for `GLOBAL_ADMIN`.
- **Token mistakes** — dropping `jti`/`tokenType`, widening 15m/7d lifetimes, or
  failing to blacklist the old refresh `jti` on rotation (#51) — an intercepted
  refresh token then replays for 7 days (persistent account takeover). Always
  pin `HS256` (#29).
- **Storing a malicious URL** — validate connector / OSINT / gateway URLs with
  `validateUrl()` **at input time, before encryption** (#59), not only at fetch
  time. Prefer `resolveAndValidateUrl()` (DNS-rebinding defense).
- **New credential field not redacted** — add its key to `SENSITIVE_KEYS` (audit
  interceptor, #66) **and** the pino `redact` array (#57) or it leaks to audit /
  log aggregation.
- **Committing or defaulting a secret** — no fallback `JWT_SECRET` /
  `CONFIG_ENCRYPTION_KEY`; `.env.example` ships **empty** values with generation
  instructions, never zero-entropy placeholders (#53). All-zero keys are
  effectively plaintext and rejected by `env.validation.ts`.
- **Leaking internals in responses** — no file paths, stack traces, Prisma
  table/column names, internal service URLs, or app version in **any**
  environment (#44/#60/#63/#77/#81/#82). Throw `BusinessException` with a
  `messageKey`, never a raw Nest exception (#17/#18).
- **Rendering raw AI HTML / silent AI execution** — no `dangerouslySetInnerHTML`
  with AI content; destructive AI actions need a persisted `ApprovalRequest`
  first (#97).
- **Claiming a scan passed without running it** — Trivy and gitleaks are **not
  bundled**; install them, run them, and report the real output.

---

## Validation commands

Run from **repo root** (pnpm only, Node 22). Full list:
[`../memory/COMMANDS_MEMORY.md`](../memory/COMMANDS_MEMORY.md).

```bash
pnpm install            # install workspace deps
pnpm typecheck          # blocking gate (tsc --noEmit across the workspace)
pnpm build              # blocking gate (includes nest build for apps/api)
pnpm validate           # typecheck + lint + format:check

# Security scans (Trivy + gitleaks are NOT bundled — install them first)
pnpm scan:secrets       # gitleaks detect --source . --redact  (hard gate in CI)
pnpm scan:trivy         # trivy fs (vuln,secret,misconfig; HIGH,CRITICAL; --exit-code 0)
pnpm audit:security     # pnpm audit --audit-level=low  then  pnpm scan:trivy
pnpm audit              # dependency vulnerabilities (advisory)
```

- Install scanners: Trivy <https://trivy.dev/latest/getting-started/installation/>,
  gitleaks <https://github.com/gitleaks/gitleaks#installing>.
- **Hard gates (must pass):** `pnpm typecheck` · `pnpm build` · Docker image
  builds · **gitleaks** (no committed secrets) · **CodeQL**. **Advisory** (run +
  annotate, non-blocking today due to tracked debt): `pnpm lint` / `format:check`,
  `pnpm test`, `pnpm audit`, Trivy fs. See
  [`../rules/testing/quality-gates.md`](../rules/testing/quality-gates.md),
  [`../docs/security/SECURITY_SCANS.md`](../docs/security/SECURITY_SCANS.md), and
  [`../docs/audit/`](../docs/audit/).

> **Never claim a gate (or a scan) is green without running it.** Report exactly
> what passed, what failed, and any blocker — per [`../AGENTS.md`](../AGENTS.md)
> §5 and §13. Branch first; never work on `main`.

---

## Related

- [`../AGENTS.md`](../AGENTS.md) — §6 security invariants, §7 AI safety, §8 branch
  safety.
- [`./BACKEND_CONTEXT.md`](./BACKEND_CONTEXT.md) — the layering and where security
  controls sit in the module structure.
- [`./FRONTEND_CONTEXT.md`](./FRONTEND_CONTEXT.md) — proxy boundary + frontend
  security rules.
- [`../rules/security/`](../rules/security/), [`../rules/ai/`](../rules/ai/),
  [`../skills/devsecops/`](../skills/devsecops/),
  [`../memory/SECURITY_MEMORY.md`](../memory/SECURITY_MEMORY.md),
  [`../docs/security/`](../docs/security/) — the full security surface.
