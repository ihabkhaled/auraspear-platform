# ADR-0005 — TypeScript 5.9 + tsgo (advisory fast typecheck)

- Status: Accepted
- Date: 2026-06-20

## Context

We want faster type-checking via the TypeScript native compiler preview
(`@typescript/native-preview`, the `tsgo` binary) without compromising the
trusted `tsc` gate or weakening any tsconfig.

## Decision

- **`tsc` (TypeScript 5.9) remains the single blocking typecheck gate**
  (`pnpm typecheck` / `typecheck:ci`, run in CI).
- Add **`@typescript/native-preview`** (tsgo `7.0.0-dev`) as a root devDependency
  and a `typecheck:fast` script (`tsgo -p tsconfig.json --noEmit`) per package +
  `pnpm typecheck:fast` (turbo) at the root — **advisory only**.
- **Do not weaken any tsconfig** to make tsgo pass.

## Result (measured 2026-06-20, tsgo 7.0.0-dev)

| Project           | `tsc` | `tsgo` | Blocker                                                                                                                                    |
| ----------------- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/shared` | ✅    | ✅     | —                                                                                                                                          |
| `packages/ai`     | ✅    | ✅     | —                                                                                                                                          |
| `apps/api`        | ✅    | ⚠️     | path issue FIXED (relative `paths`, no `baseUrl`); remaining tsgo-only gap: `@types/jest` globals not auto-loaded for in-`src` `*.spec.ts` |
| `apps/web`        | ✅    | ✅     | FIXED via an ambient `declare module '*.css'` (`apps/web/src/css-modules.d.ts`)                                                            |

**Update (after non-weakening fixes):** tsgo is now green for the web app and
both packages. The api's `tsconfig.json` was changed to relative `paths`
(`"@/*": ["./src/*"]`) with no `baseUrl` — valid for **both** tsc and tsgo; the
only remaining tsgo gap is `jest` globals in co-located spec files (test code,
not production). No tsconfig was weakened — strict flags are unchanged.

## Consequences

- `pnpm typecheck:fast` is available locally and for the packages; it is **not a
  CI gate** until tsgo handles the app blockers without tsconfig changes.
- When tsgo stabilizes (`baseUrl`/paths handling, CSS side-effect declarations),
  revisit promoting `typecheck:fast` to a non-blocking CI job, then a gate.
- See `docs/tools/TYPESCRIPT_AND_TSGO.md` for commands and the migration plan.

## Alternatives considered

- Rewrite `apps/api/tsconfig.json` to drop `baseUrl` and use `paths: {"@/*": …}`
  with relative roots — rejected for now: it changes a working config purely to
  satisfy an experimental compiler.
- Make tsgo a blocking gate — rejected: it is a dev preview and fails on the apps.
