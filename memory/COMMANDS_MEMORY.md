# COMMANDS_MEMORY

The commands that matter, and when to run them. Run all from the repo root.

## Setup / DX

| Command                                                                      | When                                                    |
| ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| `pnpm install`                                                               | first, and after pulling dependency changes             |
| `pnpm doctor`                                                                | check your environment (Node/pnpm/Docker/git)           |
| `pnpm setup:env`                                                             | create `.env` files with generated secrets (idempotent) |
| `bash scripts/install/install.sh` / `pwsh -File scripts/install/install.ps1` | one-shot install                                        |

## Validate (run before claiming done)

| Command                                             | Gate type                                |
| --------------------------------------------------- | ---------------------------------------- |
| `pnpm typecheck`                                    | **hard** (tsc, blocking)                 |
| `pnpm typecheck:fast`                               | advisory (tsgo)                          |
| `pnpm build`                                        | **hard**                                 |
| `pnpm lint` / `pnpm lint:strict`                    | advisory (pre-existing debt)             |
| `pnpm format:check` / `pnpm format`                 | advisory / fix                           |
| `pnpm test` / `pnpm test:e2e`                       | advisory                                 |
| `pnpm validate`                                     | typecheck + lint:strict + format:check   |
| `node scripts/install/validate-system.mjs [--full]` | install→generate→typecheck→build (→test) |

## Security / deps

| Command                              | When                                                          |
| ------------------------------------ | ------------------------------------------------------------- |
| `pnpm audit --audit-level=low`       | dependency vulnerabilities                                    |
| `pnpm scan:trivy`                    | Trivy fs scan (vuln/secret/misconfig) — needs trivy installed |
| `pnpm scan:secrets`                  | gitleaks secret scan — needs gitleaks installed               |
| `pnpm audit:security`                | pnpm audit + Trivy                                            |
| `pnpm audit:deps` / `pnpm audit:env` | outdated report / env-var audit                               |

## Run

| Command                                          | What                        |
| ------------------------------------------------ | --------------------------- |
| `pnpm dev` / `pnpm dev:api`                      | web / api dev servers       |
| `pnpm docker:dev` / `:prod` / `:infra` / `:down` | Docker stacks               |
| `pnpm docker:healthcheck`                        | health of the running stack |

## Database (api)

| Command                | What                                 |
| ---------------------- | ------------------------------------ |
| `pnpm prisma:generate` | generate the Prisma client           |
| `pnpm prisma:migrate`  | run migrations (dev)                 |
| `pnpm prisma:seed`     | seed (needs `SEED_DEFAULT_PASSWORD`) |

## CI status

| Command                         | What             |
| ------------------------------- | ---------------- |
| `gh pr checks <n>`              | PR gate statuses |
| `gh run view <id> --log-failed` | why a run failed |

Related: [[TECHNICAL_MEMORY]] · `AGENTS.md` §4 command map.
