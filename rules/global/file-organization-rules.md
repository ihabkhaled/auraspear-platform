# File-organization rules — every declaration has one home file

> **Read `AGENTS.md` first** (repo root) for the AI loading order. Then read the
> app's `CLAUDE.md`. GOD MODE §8 (file organization) is the source. The
> authoritative, ESLint-enforced specifics are **`apps/web/CLAUDE.md` rule 13**
> (and 14–18) and **`apps/api/CLAUDE.md` rule 13** — this file cross-links and
> consolidates them; where they overlap, the CLAUDE.md rule number wins.

The repo's rule is mechanical, not aesthetic: **enums, types/interfaces,
constants, schemas, mappers, policies, and utilities each live in a dedicated
file, never inline in logic files.** This is enforced by `no-restricted-syntax`
in both apps — inline declarations fail `pnpm lint`. Related:
`clean-code-rules.md` §6 (DRY), `solid-rules.md` §SRP/§ISP,
`../backend/layering-rules.md` §5, `../frontend/component-rules.md` §1.

---

## 1. Frontend homes (`apps/web/src/`) — CLAUDE.md rules 13–18

| Declaration               | Home                                                        |
| ------------------------- | ----------------------------------------------------------- |
| `enum`                    | `src/enums/<domain>.enum.ts` (barrel `src/enums/index.ts`)  |
| `interface` / `type`      | `src/types/<domain>.types.ts` (barrel `src/types/index.ts`) |
| constant (SCREAMING_CASE) | `src/lib/constants/<domain>.ts`                             |
| custom hook (`useX`)      | `src/hooks/` (one per file, barrel `src/hooks/index.ts`)    |
| pure utility / mapper     | `src/lib/utils.ts` or `src/lib/<domain>.utils.ts`           |
| Zod schema                | `src/lib/validation/<domain>.schema.ts`                     |
| API service object        | `src/services/` (barrel `@/services`)                       |
| Zustand store             | `src/stores/`                                               |

- **`.tsx` files contain only JSX** — no enum/type/const/hook/util/schema inline
  (`apps/web/CLAUDE.md` rules 13–18; ESLint bans `TSEnumDeclaration`,
  `TSInterfaceDeclaration`, `TSTypeAliasDeclaration`,
  `FunctionDeclaration[id.name=/^use[A-Z]/]`, and SCREAMING_CASE module `const`
  in `.tsx`/`hooks/`/`services/`/`stores/`/`api/`). Exception: a small
  file-local config object used only in that file may sit inline at the top
  (rule 13).
- **Filenames:** PascalCase components without consecutive uppercase
  (`MitreBarChart.tsx`, not `MITREBarChart.tsx`) — `unicorn/filename-case`,
  rule 25.

## 2. Backend homes (`apps/api/src/`) — CLAUDE.md rule 13

| Declaration                | Home                                                            |
| -------------------------- | --------------------------------------------------------------- |
| `interface` / `type`       | `<module>.types.ts` or `src/common/interfaces/`                 |
| `enum`                     | `<module>.enums.ts` or `src/common/enums/`                      |
| constant                   | `<module>.constants.ts` or `src/common/constants/`              |
| standalone function        | `<module>.utilities.ts` or `src/common/utils/<name>.utility.ts` |
| Zod schema + inferred type | `dto/<name>.dto.ts`                                             |
| mapper / transformer       | `<module>.utilities.ts` (pure named functions)                  |

- **Inline declarations in services/controllers/repositories/guards/
  interceptors/filters/pipes/utilities are banned** (`apps/api/CLAUDE.md` rule 13;
  `no-restricted-syntax` on `TSInterfaceDeclaration`, `TSTypeAliasDeclaration`,
  `TSEnumDeclaration`, `FunctionDeclaration`, top-level `const`).
- **Utility files hold pure functions only** — no types/enums/constants inside
  (`apps/api/CLAUDE.md` rule 14c).
- **Use the full word, never abbreviate the filename:** `*.utilities.ts` /
  `*.utility.ts`, never `*.utils.ts` / `*.util.ts` (`unicorn/prevent-abbreviations`,
  rule 69). **All backend files are kebab-case** (`auth.guard.ts`,
  `create-case.dto.ts` — `apps/api/CLAUDE.md` "File Naming").
- **Exception:** `dto/` files may define Zod-inferred types
  (`export type CreateCaseDto = z.infer<typeof CreateCaseSchema>`).

## 3. The categories, and where each belongs

- **Enums** — every string-literal domain value (`'active'` → `CaseStatus.ACTIVE`)
  and no string-literal union types (`TSUnionType > TSLiteralType` is `error` in
  both apps — `apps/web/CLAUDE.md` rule 17, `apps/api/CLAUDE.md` rule 12).
- **Types/interfaces** — one definition, imported everywhere; duplicates
  prohibited (`apps/web/CLAUDE.md` "Type Conventions"). `interface` for object
  shapes, `type` for unions/intersections.
- **Constants** — shared/domain constants in their home file; OSINT source
  definitions and permission definitions are constants, never hardcoded in
  services (`apps/api/CLAUDE.md` rule 100).
- **Schemas → DTOs** — Zod schema + inferred type per `dto/<name>.dto.ts`
  (backend) or `src/lib/validation/` (frontend);
  `../backend/dto-validation-rules.md`.
- **Mappers / utilities** — pure functions in `<module>.utilities.ts` /
  `src/lib/`; they hold the cyclomatic complexity so services/components stay thin
  (`../backend/layering-rules.md` §4).
- **Policies** — RBAC permission definitions/defaults live in their own files
  (`permission-definitions.ts`, `default-permissions.ts`); AI action policy lives
  in `packages/ai/src/safety.ts` (`../security/rbac-rules.md`,
  `../ai/ai-safety-rules.md`).

## 4. How it's enforced

- **ESLint `no-restricted-syntax`** (both apps) is the primary gate — it makes
  these structural, not stylistic, and they block `pnpm lint`
  (`docs/audit/eslint-hardening-audit.md`).
- **`unicorn/filename-case`** enforces naming; **`tsc`** plus the barrel-import
  rules keep the homes discoverable.
- **`packages/config` manifests must match disk** — don't declare preset
  directories that don't exist (audit PKG-02; `monorepo-boundaries.md` §5).

---

## Self-check before you commit

- [ ] No inline `enum`/`interface`/`type`/SCREAMING_CASE `const`/standalone
      function in a logic file (`.tsx`, service, controller, repo, hook, store,
      api route, utility).
- [ ] Enums in `src/enums/` (FE) or `<module>.enums.ts` (BE); types in
      `src/types/` / `<module>.types.ts`; constants in `src/lib/constants/` /
      `<module>.constants.ts`; schemas in `validation/` / `dto/`.
- [ ] Backend utilities are pure functions only; filenames use full words
      (`utilities`, not `utils`) and the right case (kebab BE / Pascal FE).
- [ ] No duplicate definition of a type/enum/contract (`clean-code-rules.md` §6).
- [ ] `pnpm lint` + `pnpm typecheck` ran and passed (`validation-gates.md`);
      branched first (`branch-safety.md`).
