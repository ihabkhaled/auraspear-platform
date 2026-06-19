# Secret Handling

How secrets are created, stored, and kept out of the repo. Rules:
[`../../rules/security/secret-handling.md`](../../rules/security/secret-handling.md).
Variable reference: [`../ENVIRONMENT.md`](../ENVIRONMENT.md).

## Golden rules

- **Only `*.example` env files are committed.** Real values live in gitignored
  `.env` files (root + per app). `gitleaks` enforces this in CI.
- **No fallback production secrets.** Code must not default a secret to a literal.
- **No secrets in logs.** pino redacts password/credential keys; AI redaction
  strips secrets before model calls (`@auraspear/ai` `redact()`).
- **No secrets in Docker images.** `.dockerignore` excludes `.env`; secrets are
  injected at runtime via env/compose.

## Generating secrets

```bash
pnpm setup:env     # creates .env files from *.example with strong random secrets (idempotent)
# or a single value:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Enforced by env validation (`apps/api/src/config/env.validation.ts`)

| Variable                | Rule                                          |
| ----------------------- | --------------------------------------------- |
| `JWT_SECRET`            | ≥ 64 hex chars, not all zeros                 |
| `CONFIG_ENCRYPTION_KEY` | exactly 64 hex chars (AES-256), not all zeros |
| `REDIS_PASSWORD`        | ≥ 16 chars in production                      |
| `SEED_DEFAULT_PASSWORD` | required (no fallback)                        |
| `CORS_ORIGINS`          | valid http/https; no localhost in production  |
| OIDC group              | all-or-nothing                                |

The app **fails to boot** if these are weak or missing.

## At rest

- **Connector credentials** are encrypted with AES-256-GCM
  (`CONFIG_ENCRYPTION_KEY`) before storage; never returned in API responses.
- JWTs are signed (HS256) with `JWT_SECRET`; refresh tokens rotate; revoked JTIs
  are blacklisted in Redis.

## If a secret leaks

1. Rotate it immediately (new `.env`, restart, re-issue tokens).
2. Invalidate exposed sessions/tokens.
3. Purge from history if it was committed (and rotate regardless — assume
   compromised). Add a `gitleaks` allowlist only for confirmed false positives.
