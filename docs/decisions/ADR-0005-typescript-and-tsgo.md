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

| Project           | `tsc` | `tsgo` | Blocker                                                                              |
| ----------------- | ----- | ------ | ------------------------------------------------------------------------------------ |
| `packages/shared` | ✅    | ✅     | —                                                                                    |
| `packages/ai`     | ✅    | ✅     | —                                                                                    |
| `apps/api`        | ✅    | ❌     | `TS5102` (tsgo removed `baseUrl`) + `TS5090` (non-relative paths) in `tsconfig.json` |
| `apps/web`        | ✅    | ❌     | `TS2882` cannot resolve the side-effect import `./globals.css`                       |

So tsgo already works for the dependency-free packages but is **not yet ready
for the apps** (NestJS `baseUrl`/path style and Next.js CSS side-effect imports).

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
