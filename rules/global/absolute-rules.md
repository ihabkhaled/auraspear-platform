# Absolute Rules — never violate

> **Read `AGENTS.md` first** (repo root). It defines the AI loading order and the
> one rule: _no AI agent may edit first and understand later._ This file is the
> non-negotiable layer on top of it. A change that breaks any rule below is wrong
> even if it typechecks, builds, and "looks done."

These rules are derived from the real enforced rules in `apps/api/CLAUDE.md`
(100 backend rules) and `apps/web/CLAUDE.md` (63 frontend rules), plus the
security/AI/branch invariants in `AGENTS.md` §6–§8. Where a rule below has a
matching deeper rule, the area file is authoritative for the specifics:
`../security/`, `../ai/`, `../backend/`, `../frontend/`, `../testing/`,
`../docs/`, and `branch-safety.md` in this directory.

If a rule blocks you, **fix the code or stop and report the blocker** (per the
final-response format in `AGENTS.md` §13). Do not work around it.

---

## 1. Type safety & lint integrity

- **No `any`.** Use `unknown`, generics, or a real type. `@typescript-eslint/no-explicit-any`
  is `error` in both apps (`apps/api/CLAUDE.md` rule 1, `apps/web/CLAUDE.md` rule 1).
- **No suppressions.** No `// eslint-disable`, `// eslint-disable-next-line`,
  `@ts-ignore`, or `@ts-expect-error`. Zero exceptions — fix the root cause
  (`apps/api/CLAUDE.md` rule 2, `apps/web/CLAUDE.md` rules 2 & 12).
- **No `!` non-null assertion, no `var`, no `==`/`!=`.** Use `??`/`?.`/explicit
  null checks, `const`/`let`, and `===`/`!==` (both CLAUDE.md, rules 3–7).
- **No fake-green gates.** Never claim "all green" unless the required gate
  actually ran and passed (`AGENTS.md` §5, §13). Never weaken a `tsconfig.json`
  to make a typecheck pass — `tsc` (TypeScript 5.9) is the **single blocking**
  typecheck; `tsgo` (`pnpm typecheck:fast`) is **advisory only** and must never
  be made the gate by changing config (`docs/decisions/ADR-0005`, `AGENTS.md` §4–§5).

## 2. Auth, tenant & RBAC — no bypass, ever

- **No auth bypass in any environment.** No dev-mode shortcut, fake user, skipped
  JWT verification, or `if (NODE_ENV === 'development')` that skips a security
  check (`apps/api/CLAUDE.md` rules 23 & 56). Role comes only from the validated
  JWT — never forward client `X-Role`/auth headers (`apps/api/CLAUDE.md` rule 76,
  `apps/web/CLAUDE.md` rule 41).
- **Tenant isolation is mandatory.** Every tenant-owned query is scoped by
  `tenantId` (`AGENTS.md` §6, `apps/api/CLAUDE.md` rule 8). **Never** `update()`
  or `delete()` by `id` alone — always `where: { id, tenantId }`
  (`apps/api/CLAUDE.md` rule 26). Validate parent ownership before touching child
  resources (`apps/api/CLAUDE.md` rule 75).
- **Every endpoint has `@RequirePermission(Permission.MODULE_ACTION)`.** Never
  ship an endpoint without it (`AGENTS.md` §6, `apps/api/CLAUDE.md` rule 25). A
  new permission is added **end-to-end in one change** (enum → definitions →
  defaults → decorator → migration with `WHERE NOT EXISTS` → frontend enum →
  proxy route → i18n in all 6 locales → seed) — `apps/api/CLAUDE.md` rule 85,
  `apps/web/CLAUDE.md` rule 34.

## 3. Secrets

- **No committed secrets, no fallback secrets.** Only `*.example` env files are
  committed, and signing/encryption secrets in them are **empty** with generation
  instructions — never zero-entropy or placeholder values
  (`AGENTS.md` §6, `apps/api/CLAUDE.md` rules 24, 53, 54).
- **Fail loud, never default.** Encryption keys, JWT secrets, and API keys load
  from env with **no `??` fallback**; the app/seed crashes at startup if missing
  (`apps/api/CLAUDE.md` rules 24 & 54).
- **Connector credentials are AES-256-GCM encrypted at rest** and redacted from
  logs/audit (`AGENTS.md` §6, `apps/api/CLAUDE.md` rules 57 & 66). Never log
  tokens/credentials, frontend or backend (`apps/web/CLAUDE.md` rule 39).

## 4. AI safety

- **AI may analyze and suggest; it must not silently act.** Destructive
  security/infra actions are `approval-required` and need a **persisted
  `ApprovalRequest` before execution** plus the permission
  (`AGENTS.md` §7, `apps/api/CLAUDE.md` rule 97).
- **Never render raw AI output as HTML.** No `dangerouslySetInnerHTML` with AI
  content — render markdown via a safe renderer or plain text
  (`AGENTS.md` §7, `apps/web/CLAUDE.md` rule 43; `react/no-danger` is `error`).
- **No mock/placeholder AI in production.** No `BEDROCK_MOCK` or env-gated mock
  mode; route through the connector cascade and fall back to `model: 'rule-based'`
  only when no connector is configured (`apps/api/CLAUDE.md` rules 88 & 89,
  `apps/web/CLAUDE.md` rule 30). AI memory is tenant-scoped and must not store
  secrets — redact before model calls (`AGENTS.md` §7).

## 5. Backend architecture (strict layering)

- **Controllers route and delegate only.** No business logic, no `try/catch`, no
  `throw`, no transforms — call ONE service method and return
  (`apps/api/CLAUDE.md` rule 14; ESLint-enforced).
- **No unvalidated input.** Every DTO is a Zod schema; every string field has
  `.max()`, every array field has `.max()` (`apps/api/CLAUDE.md` rules 27, 28).
  Never bind `@Query()`/`@Body()` to a DTO type without running the schema, and
  never use `@UsePipes()` at method level alongside `@Param()`
  (`apps/api/CLAUDE.md` rules 16 & 19).
- **Repositories are pure data access**; every method takes `tenantId`. Services
  never import `PrismaService` (`apps/api/CLAUDE.md` rules 14a–14b).
- **Schema changes ship a Prisma migration** (`apps/api/CLAUDE.md` rule 30).

## 6. Frontend architecture

- **Components never call the backend directly.** All backend calls go through a
  `src/app/api/` proxy route via `proxyToBackend()`; every new backend endpoint
  the frontend uses gets a matching proxy route (`apps/api/CLAUDE.md` rule 86,
  `apps/web/CLAUDE.md` rule 33). Components don't call AI services directly —
  they go through `src/hooks/useAi*.ts` (`apps/web/CLAUDE.md` rule 41).
- **`.tsx` files contain only JSX.** No hook definitions, hook calls, utilities,
  enums, types, or constants inline — extract to `src/hooks/`, `src/lib/`,
  `src/enums/`, `src/types/`, `src/lib/constants/`
  (`apps/web/CLAUDE.md` rules 13–17; ESLint-enforced).

## 7. Branch & destructive-change safety

- **Never work directly on `main`.** Branch first (`feat/…`, `fix/…`, `chore/…`)
  — `AGENTS.md` §8. See `branch-safety.md`.
- **pnpm only.** Node 22, pnpm workspaces. Never introduce `npm`/`yarn` lockfiles
  or commands at the repo root (`AGENTS.md` §3–§4; `ADR-0001`, `ADR-0002`).
- **Prove before deleting.** Never remove a file, dependency, env var, or DB
  volume without auditing every consumer — imports, routes, Docker, CI, docs,
  Prisma, seed, tests, `*.example` (`AGENTS.md` §8). State the evidence in your
  report.
- **No unrequested destructive commands.** No `rm -rf`, `git reset --hard`,
  `git clean -fd`, or `docker compose down -v` (deletes DB volumes) unless
  explicitly required **and** documented; DB volume deletion needs explicit
  approval (`AGENTS.md` §8).
- **No breaking upgrades without validation.** Run `pnpm validate` (or the
  relevant gates) after any dependency or tooling change; follow
  `../../skills/devsecops/upgrade-dependency.md` (`AGENTS.md` §11).

## 8. Gates, CI & docs

- **Never weaken a security or CI gate.** Don't disable or loosen gitleaks,
  CodeQL, Trivy, Helmet/CSP, rate limits, SSRF validation, or the `tsc`/build
  gates to get green (`AGENTS.md` §5–§6; `apps/api/CLAUDE.md` rules 35, 42, 59,
  62, 80). CSP must not allow `'unsafe-inline'`; connector URLs are SSRF-validated
  at input time.
- **No stale docs.** When behavior, commands, env, permissions, or architecture
  change, update the affected `docs/**`, `memory/**`, and the i18n locale files
  in the same change — partial updates are a violation (`AGENTS.md` §1, §12;
  `apps/api/CLAUDE.md` rule 49 — messageKeys exist in all 6 locales). See
  `../docs/`.

---

### When in doubt

Read the area rule (`../security/`, `../ai/`, `../backend/`, `../frontend/`),
then the matching skill in `../../skills/`, then the code. If a task seems to
require breaking a rule, it doesn't — surface it as a blocker instead.
