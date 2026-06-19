# ADR-0003 — Proceed from the flattened root (no history rewrite)

- Status: Accepted
- Date: 2026-06-19

## Context

The migration target `auraspear-platform` already existed as a fresh git repo
whose single "first commit" contained both projects as plain subdirectories
(`auraspear/`, `auraspear-backend/`) — they were **not** nested git repos, so
the original per-commit history was already absent from this root. The original
histories still live in the source GitHub repos (`ihabkhaled/auraspear`,
`ihabkhaled/auraspear-backend`).

## Decision

Restructure folders in place (`auraspear → apps/web`, `auraspear-backend →
apps/api`) on top of the existing root, rather than re-importing both repos with
`git subtree`/`git filter-repo` to reconstruct history.

## Rationale

- History was already collapsed before this work began; reconstructing it would
  mean re-cloning both upstreams and grafting subtrees — significant effort for
  a brand-new platform repo with one prior commit.
- The authoritative per-file history remains available upstream if ever needed
  (e.g., `git log` on the original repos, or `git blame` there).
- Keeps the initial monorepo history clean and linear.

## Consequences

- `git blame` inside `apps/web` / `apps/api` traces to the migration commit, not
  the original authors' commits. Acceptable for a new platform baseline.
- If full history preservation becomes a hard requirement later, it can be done
  as a separate, deliberate `git subtree add --prefix` import from the upstreams.
