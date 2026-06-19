#!/usr/bin/env bash
# AuraSpear Platform installer (Linux / macOS / WSL).
# Idempotent and safe to re-run. Does NOT install system packages — it detects
# what is missing and tells you the command to run.
set -euo pipefail

cd "$(dirname "$0")/../.."   # repo root
say()  { printf '\033[36m▶ %s\033[0m\n' "$1"; }
ok()   { printf '\033[32m✓ %s\033[0m\n' "$1"; }
warn() { printf '\033[33m! %s\033[0m\n' "$1"; }
die()  { printf '\033[31m✗ %s\033[0m\n' "$1"; exit 1; }

say "Checking prerequisites"
command -v node >/dev/null 2>&1 || die "Node.js not found. Install Node 22 LTS: https://nodejs.org (or use nvm)."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 22 ]; then die "Node $(node -v) found — AuraSpear needs Node >= 22 (LTS)."; fi
ok "Node $(node -v)"

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    say "Enabling pnpm via corepack"
    corepack enable || warn "corepack enable failed (may need sudo); falling back."
    corepack prepare pnpm@10.30.3 --activate || true
  fi
fi
command -v pnpm >/dev/null 2>&1 || die "pnpm not found. Run: corepack enable && corepack prepare pnpm@latest --activate"
ok "pnpm $(pnpm -v)"

command -v git >/dev/null 2>&1 && ok "git $(git --version | awk '{print $3}')" || warn "git not found"
if command -v docker >/dev/null 2>&1; then ok "docker $(docker --version | awk '{print $3}' | tr -d ,)"; else warn "Docker not found (optional — needed for pnpm docker:*)"; fi

say "Installing dependencies (pnpm install)"
pnpm install
ok "Dependencies installed"

say "Setting up environment files (pnpm setup:env)"
node scripts/install/setup-env.mjs
ok "Environment ready"

say "Running doctor"
node scripts/install/doctor.mjs || true

cat <<'EOF'

Next steps:
  pnpm typecheck        # validate the workspace
  pnpm docker:infra     # start Postgres + Redis (or pnpm docker:dev for the full stack)
  pnpm dev              # run the web app   (pnpm dev:api for the API)

Docs: README.md, INSTALL.md, docs/ENVIRONMENT.md
EOF
