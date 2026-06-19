# Rules — Secret handling

> **Read `../../AGENTS.md` first** (loading order + the one rule: understand
> before you edit; §6 "Security invariants" — _never commit secrets; only
> `*.example` env files; no fallback production secrets; connector credentials
> are AES-256-GCM encrypted at rest_). Then `../../apps/api/CLAUDE.md` rules
> **#24, #53, #54** (the source of these constraints). Siblings: the consolidated
> `security-rules.md` §11 (overview), `../../skills/devsecops/add-env-variable.md`
> (the end-to-end recipe), `../../docs/security/SECRET_HANDLING.md` (architecture).
> These are **hard constraints**. A violation is a committed credential, a
> publicly-known seeded admin password, or plaintext-equivalent encryption — not
> a style nit.

Every secret claim below maps to real code, cited by path. The trust boundary is
`apps/api/src/config/env.validation.ts` (fail-closed env schema),
`scripts/install/setup-env.mjs` (generation), and
`apps/api/src/common/utils/encryption.utility.ts` (AES-256-GCM at rest).

---

## 1. Only `*.example` files are committed — never a real `.env`

- `.gitignore` ignores `.env`, `.env.local`, `.env.*.local`, `.env.development`,
  `.env.staging`, `.env.production`, `.env.docker` and **re-allows only**
  `!.env.example` and `!.env.*.example` (`.gitignore:27`). The committed
  templates are `.env.example`, `.env.production.example`, `apps/api/.env.example`,
  `apps/web/.env.example`.
- **Never commit a populated `.env`.** Never paste a real key/password into an
  `*.example` file — secret slots ship **empty** with generation instructions in
  comments (`apps/api/.env.example:60-70`: `CONFIG_ENCRYPTION_KEY=` /
  `JWT_SECRET=` with the `node -e "...randomBytes(32).toString('hex')"` hint).
- **No zero-entropy or placeholder secrets in examples** (CLAUDE.md #53). All-zero
  keys (`0000…`) are effectively plaintext; the env schema rejects them (§4).
  `DATABASE_URL`/`POSTGRES_PASSWORD` use the obvious `change-me-…` marker, not a
  real value.
- Run `pnpm scan:secrets` (gitleaks, `package.json:48`) before pushing —
  committed secrets are a **hard CI gate** (`AGENTS.md` §5). If gitleaks fires,
  rotate the secret and scrub history; do not just delete the line.

## 2. Secrets are generated, never authored — `pnpm setup:env`

`scripts/install/setup-env.mjs` copies each `*.example` → `.env` and fills empty
secret slots with cryptographically strong random values (`node:crypto`
`randomBytes`):

- `JWT_SECRET`, `CONFIG_ENCRYPTION_KEY` → `randomBytes(32).toString('hex')`
  (64 hex chars; `setup-env.mjs:15,19-20`).
- `REDIS_PASSWORD` → `randomBytes(16)` base64url (≥16 chars; `:24`).
- `SEED_DEFAULT_PASSWORD` → `Aura-<base64url>!1` (`:21`); `POSTGRES_PASSWORD`,
  `PGADMIN_PASSWORD` likewise generated (`:22-23`).
- **Idempotent:** it never overwrites an existing `.env` (only fills **empty**
  slots) unless `--force` is passed (`:14,39,58`). Do not hand-edit generated
  secrets to "rememberable" values.
- Adding a **new** secret env var? Add an empty slot to the relevant `*.example`,
  add it to the `GENERATORS` map in `setup-env.mjs` if it should be auto-filled,
  **and** add a fail-closed rule to `env.validation.ts` (§4). See
  `../../skills/devsecops/add-env-variable.md`.

## 3. No fallback / hardcoded production secrets — fail loudly (CLAUDE.md #24)

- Encryption keys, JWT secrets, and API keys load from env with **no default
  value**. `JWT_SECRET` and `CONFIG_ENCRYPTION_KEY` have **no `.default()`** in
  `env.validation.ts` — a missing value throws at boot via
  `validateEnvironment()` (`env.validation.ts:155-164`).
- **Never write `process.env.X ?? 'fallback'`** for a secret. No `||`/`??`
  default, no inline literal, no `if (NODE_ENV === 'development') { useDevKey() }`
  (CLAUDE.md #56). Security validations run in **every** environment.
- `connectors.service.ts` reads `CONFIG_ENCRYPTION_KEY` from `ConfigService` and
  **throws** if it is not exactly 64 hex (`connectors.service.ts:72-74`) — it does
  not silently fall back to a weak key.
- **Seed scripts have no fallback password** (CLAUDE.md #54). `SEED_DEFAULT_PASSWORD`
  is required via `requireEnv()` which throws if unset (`apps/api/prisma/seed.ts:85-95`).
  Never reintroduce a literal like `Admin@123` or a `?? 'password'` fallback —
  that hands every seeded admin a publicly-known credential.
- `NODE_ENV` defaults to `production` (`env.validation.ts:49`, CLAUDE.md #58) so a
  misconfigured deploy fails **closed**, not into dev permissiveness.

## 4. Env validation enforces secret strength (`env.validation.ts`)

The Zod schema is the gate. Match these exactly when adding/changing a secret:

| Var                       | Rule                                                                                        | Source                    |
| ------------------------- | ------------------------------------------------------------------------------------------- | ------------------------- |
| `JWT_SECRET`              | `.min(32)` **and** `.refine` ≥64 hex chars (`/^[\da-f]+$/i`) **and** rejects all-zeros      | `env.validation.ts:26-35` |
| `CONFIG_ENCRYPTION_KEY`   | `.length(64)` + `.regex(/^[\da-f]{64}$/i)` (32 bytes for AES-256) **and** rejects all-zeros | `:106-115`                |
| `REDIS_PASSWORD`          | `.refine` ≥16 chars **when `NODE_ENV === 'production'`** (empty allowed in dev)             | `:12-17`                  |
| `SEED_DEFAULT_PASSWORD`   | **required**, no fallback (enforced in `seed.ts`, not the app schema)                       | `seed.ts:85-95`           |
| `PLATFORM_ADMIN_PASSWORD` | optional, but `.min(12)` when set                                                           | `:38-41`                  |
| OIDC group                | all-or-nothing via `superRefine` — partial config throws                                    | `:134-151`                |

- A new signing/encryption secret **must** get its own `.refine()` that (a)
  enforces length/entropy and (b) **rejects all-zeros** (`!/^0+$/.test(value)`),
  mirroring `:33` and `:113`.
- Production-only stricter rules use
  `.refine(v => process.env.NODE_ENV !== 'production' || <condition>)` (see
  `REDIS_PASSWORD` `:15`, `CORS_ORIGINS` `:84`). Keep dev usable, prod strict.

## 5. Connector secrets — AES-256-GCM at rest (CLAUDE.md "Key Principles" #4)

- Per-tenant connector credentials and custom OSINT API keys (CLAUDE.md #96) are
  encrypted **before** they touch the DB via `encrypt()` in
  `apps/api/src/common/utils/encryption.utility.ts`:
  `aes-256-gcm` (`encryption.constants.ts: ALGORITHM`), random 16-byte IV per
  call, 16-byte auth tag, output `iv:authTag:ciphertext` (all base64).
- The key is `CONFIG_ENCRYPTION_KEY` (32 bytes / 64 hex). `encrypt()` **rejects**
  a key that is not exactly 64 hex (`encryption.utility.ts:5-7`). Decryption
  verifies the GCM auth tag — tampered ciphertext throws (`:35-42`).
- **Always encrypt at write, decrypt only in-memory at use.** Encryption happens
  in the service (`connectors.service.ts:142,362`) before persistence. Decrypted
  config must **never** appear in an API response, a log, or an audit detail.
- Never invent a second cipher, store a plaintext credential column, or reuse a
  static IV. Use these helpers only.

## 6. Never log secrets

- Backend: only `console.warn`/`console.error` are allowed and **must not**
  contain credentials (CLAUDE.md #6). Structured request logs redact via the pino
  `redact` array in `app.module.ts` (`req.body.password`,
  `currentPassword`, `newPassword`, `confirmPassword`, CLAUDE.md #57).
- Audit logs redact via `redactSensitiveFields()` /
  `redaction.constants.ts SENSITIVE_KEYS` (CLAUDE.md #66) — covers `password`,
  `secret`, `apiKey`, `token`, `accessToken`, `refreshToken`, `clientSecret`,
  `accessKey`, `secretAccessKey`, `encryptedConfig`, `authorization`,
  `encryptionKey`, etc. **A new credential field MUST be added to this set and to
  the pino `redact` array** or it leaks. Depth: `security-rules.md` §9.
- Frontend: never log tokens/credentials anywhere — not `console.warn`, not error
  handlers, not Zustand devtools (`apps/web/CLAUDE.md` #39). Never store secrets,
  AI transcripts, or OSINT keys in `localStorage` (`apps/web/CLAUDE.md` #46, #55).
- Health/status endpoints return service **names + status** only, never
  connection strings (CLAUDE.md #81). Error responses are path-stripped and
  truncated (CLAUDE.md #44, #63) — no secret-bearing stack traces to clients.

---

## Checklist before committing a secret-touching change

- [ ] No real secret in any committed file. `pnpm scan:secrets` (gitleaks) is
      clean. Only `*.example` files committed; their secret slots are **empty**
      with generation comments (no `0000…`, no placeholders).
- [ ] New secret env var: empty slot in the right `*.example`, `GENERATORS` entry
      in `setup-env.mjs` (if auto-filled), and a fail-closed `env.validation.ts`
      rule with length/entropy **and** all-zeros rejection.
- [ ] No `?? 'fallback'`, no inline literal, no `NODE_ENV`-gated dev secret. App
      throws at boot when the secret is missing.
- [ ] Connector/OSINT credentials go through `encrypt()` (AES-256-GCM) before the
      DB; decrypted values never enter responses, logs, or audit details.
- [ ] New credential field added to `SENSITIVE_KEYS` **and** the pino `redact`
      array. Nothing secret logged (backend or frontend) or put in `localStorage`.
- [ ] Secrets are **generated** (`pnpm setup:env`), not authored. `.env` files
      stay gitignored and uncommitted.
- [ ] No `any`, no `eslint-disable`. `pnpm typecheck` passes (blocking gate;
      `tsgo`/`typecheck:fast` advisory). pnpm only, Node 22. **Branch first —
      never work on `main`.** Prove before deleting any file/dep/env var.

## Related

- `../../AGENTS.md` — §6 security invariants (secrets, connector encryption),
  §8 branch safety, §5 gitleaks gate.
- `../../apps/api/CLAUDE.md` — #24 (no hardcoded/fallback secrets), #53 (no
  zero-entropy `.env.example`), #54 (no seed fallback password), #56/#58
  (no `NODE_ENV` bypass), #57/#66 (log/audit redaction), #96 (OSINT key encryption).
- `../../apps/web/CLAUDE.md` — Security Rules #39 (never log tokens), #46/#55
  (no secrets in `localStorage`).
- `./security-rules.md` — §9 redaction, §11 secrets & connector encryption (overview).
- `../../skills/devsecops/add-env-variable.md` — end-to-end recipe for a new env var.
- `../../docs/security/SECRET_HANDLING.md`, `../../docs/ENVIRONMENT.md` — architecture + full var list.
