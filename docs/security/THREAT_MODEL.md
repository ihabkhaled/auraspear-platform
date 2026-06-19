# Threat Model

A pragmatic threat model for the AuraSpear platform. Pairs with
[`SECURITY.md`](../SECURITY.md), [`SECURITY_SCANS.md`](SECURITY_SCANS.md), and
[`../../rules/security/`](../../rules/security/).

## Assets

- Tenant security data (alerts, cases, incidents, hunts, intel, detection rules).
- **Connector credentials** (Wazuh/OpenSearch/MISP/Shuffle/Bedrock, …) —
  encrypted at rest (AES-256-GCM).
- User identities, JWTs, sessions.
- AI transcripts / memory (may contain sensitive context).

## Trust boundaries

- Browser → `apps/web` (Next.js) → **proxy** → `apps/api` (BFF). The web app never
  talks to upstream security tools directly; the API owns all credentials.
- `apps/api` → PostgreSQL, Redis, and upstream connectors (outbound).
- Multi-tenant: every tenant is a boundary — isolation is enforced in the API.

## Top threats & mitigations

| Threat                             | Mitigation                                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cross-tenant data access**       | every tenant-owned query/`update`/`delete` scoped by `tenantId`; repository methods take `tenantId`; sub-resource parent-ownership checks                |
| **AuthN/Z bypass**                 | full guard chain (Auth→Tenant→Permissions), `@RequirePermission` on every endpoint, no dev bypass; JWT `jti` + Redis blacklist + refresh rotation        |
| **Credential theft**               | connector secrets AES-256-GCM encrypted; secrets never logged (redaction); only `*.example` env committed; no fallback secrets                           |
| **SSRF** (connectors/OSINT)        | `validateUrl()` at input time + at fetch time; block link-local/metadata IPs                                                                             |
| **Injection** (ES/SQL)             | Zod-validated DTOs; sanitize ES query strings; Prisma parameterized queries                                                                              |
| **DoS**                            | rate-limit tiers (`@Throttle`), 1 MB body limit, JSON field 64 KB caps, paginated queries, request timeout                                               |
| **Token/credential leak in logs**  | pino `redact` for passwords + credential keys; no internal URLs/version in responses                                                                     |
| **Supply chain**                   | gitleaks, Trivy, pnpm audit, CodeQL, dependency-review; SHA-pinned actions; lockfile committed                                                           |
| **Malicious/over-broad AI action** | AI is analyze/suggest by default; destructive actions are `approval-required` (persisted approval + permission); never render raw AI HTML; redact inputs |
| **PII/secret exfiltration via AI** | `@auraspear/ai` `redact()` before model calls + transcript storage; AI memory tenant-scoped and secret-free                                              |
| **Header spoofing** (X-Role)       | role comes only from the validated JWT; client role headers never trusted                                                                                |

## Out of scope (assumed handled by deployment)

- TLS termination / WAF at the edge; OS/container patching; network segmentation;
  Postgres/Redis at-rest encryption; backups (see `docs/OPERATIONS.md`).

## Review triggers

Re-review on: new connector type, new AI action category, new external integration,
auth/permission change, or a new data export path.
