# Contributing to AuraSpear SOC (Backend)

Thank you for your interest in contributing to AuraSpear SOC.

## Getting Started

1. Fork the repository and clone your fork
2. Install dependencies: `npm install`
3. Copy environment template: `cp .env.example .env`
4. Start infrastructure (PostgreSQL, Redis): `npm run docker:infra`
5. Run database migrations and seed: `npm run prisma:migrate:prod && npm run prisma:seed`
6. Start the dev server: `npm run start:dev`

## Code Standards

- **TypeScript strict mode** — no `any`, no non-null assertions, no unused variables
- **ESLint** — zero warnings allowed (`npm run lint:strict`). Never disable rules with comments
- **Prettier** — auto-formatted on commit
- **Zod validation** — all request payloads validated with Zod schemas via NestJS pipes
- **Enums over string literals** — all string unions must be enums
- **Error handling** — throw `BusinessException` with i18n message keys, never expose internal details
- **Security** — no `eval()`, no dynamic code execution, no secrets in logs
- **dayjs for all date/time** — never use raw `new Date()` or `Date.now()`. Import from `src/common/utils/date-time.utility.ts`

## Architecture

- **NestJS modules** — feature-based module organization
- **Prisma ORM** — database access via generated client
- **Guards** — JWT authentication + RBAC permission guards on every endpoint
- **Services** — business logic encapsulated in injectable services
- **DTOs** — validated with Zod schemas

## Pull Request Workflow

1. Create a feature branch from `main`: `git checkout -b feat/your-feature`
2. Make your changes following the code standards above
3. Run the full validation pipeline before pushing:
   ```bash
   npm run validate:full
   ```
4. Push your branch and open a pull request against `main`
5. Fill in the PR template with a summary and test plan
6. Address review feedback promptly

## Pre-commit Hooks

Husky runs the following checks on every commit via `lint-staged`:

1. **ESLint** — lints staged files
2. **TypeScript** — full type check (`tsc --noEmit`)
3. **Prettier** — auto-formats staged files

If a hook fails, fix the issue before committing. Never bypass hooks with `--no-verify`.

## Testing Requirements

Every feature or fix should include tests covering:

- Unit tests for services and utilities
- Integration tests for controllers
- Guard and pipe validation tests
- Edge cases and error scenarios

Run tests with: `npm test`

## Error Messages and i18n

- Every `BusinessException` must use a `messageKey` following the `errors.<module>.<key>` pattern
- The corresponding translation key must exist in **all 6 frontend locale files**
- When adding a new backend error, coordinate with the frontend repo to add translations

## Contributor Docs

- [`docs/migrations-and-seeds.md`](./docs/migrations-and-seeds.md)
- [`docs/permissions-and-roles.md`](./docs/permissions-and-roles.md)
- [`docs/adding-connectors.md`](./docs/adding-connectors.md)
- [`docs/ai-agent-safety.md`](./docs/ai-agent-safety.md)
- [`INSTALL.md`](./INSTALL.md)

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add alert escalation endpoint`
- `fix: correct permission check on case update`
- `refactor: extract shared validation pipes`
- `test: add auth guard unit tests`

## Questions?

Open a GitHub Discussion or reach out to the maintainers.
