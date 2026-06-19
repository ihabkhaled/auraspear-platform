# SECURITY_MEMORY

Stable security truths. Full detail in `docs/SECURITY.md`, `docs/security/`,
`rules/security/`.

- **Tenant isolation**: every tenant-owned Prisma query/`update`/`delete` is
  scoped by `tenantId` (use `where: { id, tenantId }`). Never return another
  tenant's data. GLOBAL_ADMIN tenant-switch happens in the auth guard only.
- **RBAC**: every endpoint has `@RequirePermission(Permission.X)`; guard chain is
  Auth → Tenant → Permissions. Adding a permission is a strict end-to-end change
  (enum, definitions, defaults, decorator, migration `WHERE NOT EXISTS`, FE mirror,
  proxy route, i18n ×6, seed).
- **Auth**: OIDC + JWT/JWKS and email/password. No auth bypass in any environment.
  Access token 15m, refresh 7d, both carry `jti`; logout/refresh blacklist JTIs in
  Redis; refresh rotation revokes the old JTI. Login uses constant-time bcrypt
  compare against a dummy hash for missing users.
- **Secrets**: only `*.example` env files are committed; real values are generated
  (`pnpm setup:env`) into gitignored `.env`. **No fallback production secrets.**
  Env validation (Zod) enforces JWT ≥64 hex, CONFIG_ENCRYPTION_KEY 64 hex,
  REDIS_PASSWORD ≥16 in prod, SEED_DEFAULT_PASSWORD required, CORS no-localhost in
  prod. Connector credentials are AES-256-GCM encrypted at rest.
- **Hardening**: Helmet + explicit CSP, strict CORS, SSRF validation on
  user-supplied URLs, request body 1 MB limit, rate-limit tiers, Swagger only in
  development, no version disclosure, no internal service URLs in responses.
- **Auditability**: mutations are audit-logged via an interceptor; passwords and
  credential-shaped keys are redacted from logs.
- **Scan gates**: gitleaks (no committed secrets), Trivy fs (vuln/secret/misconfig),
  pnpm audit, CodeQL. See `docs/security/SECURITY_SCANS.md`.
- Related: [[PROJECT_MEMORY]] [[AI_MEMORY]].
