<#
  AuraSpear Platform installer (Windows PowerShell).
  Idempotent and safe to re-run. Does NOT install system packages — it detects
  what is missing and tells you what to run.
  Usage:  pwsh -File scripts/install/install.ps1   (or PowerShell 5.1)
#>
$ErrorActionPreference = 'Stop'
function Say  ($m) { Write-Host "▶ $m" -ForegroundColor Cyan }
function OK   ($m) { Write-Host "✓ $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "! $m" -ForegroundColor Yellow }
function Die  ($m) { Write-Host "✗ $m" -ForegroundColor Red; exit 1 }

# repo root = two levels up from this script
Set-Location (Join-Path $PSScriptRoot '..\..')

Say 'Checking prerequisites'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Die 'Node.js not found. Install Node 22 LTS from https://nodejs.org' }
$nodeMajor = [int](node -p 'process.versions.node.split(".")[0]')
if ($nodeMajor -lt 22) { Die "Node $(node -v) found — AuraSpear needs Node >= 22 (LTS)." }
OK "Node $(node -v)"

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  if (Get-Command corepack -ErrorAction SilentlyContinue) {
    Say 'Enabling pnpm via corepack'
    # On Windows, `corepack enable` may fail writing shims into Program Files
    # (needs admin). If so, install pnpm standalone instead.
    try { corepack enable; corepack prepare pnpm@10.30.3 --activate }
    catch { Warn 'corepack enable failed (admin needed). Install pnpm with: npm i -g pnpm' }
  }
}
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { Die 'pnpm not found. Run (Admin): corepack enable  — or: npm i -g pnpm' }
OK "pnpm $(pnpm -v)"

if (Get-Command git -ErrorAction SilentlyContinue) { OK 'git present' } else { Warn 'git not found' }
if (Get-Command docker -ErrorAction SilentlyContinue) { OK 'docker present' } else { Warn 'Docker not found (optional — needed for pnpm docker:*)' }

Say 'Installing dependencies (pnpm install)'
pnpm install
OK 'Dependencies installed'

Say 'Setting up environment files (pnpm setup:env)'
node scripts/install/setup-env.mjs
OK 'Environment ready'

Say 'Running doctor'
try { node scripts/install/doctor.mjs } catch {}

Write-Host ''
Write-Host 'Next steps:' -ForegroundColor Cyan
Write-Host '  pnpm typecheck        # validate the workspace'
Write-Host '  pnpm docker:infra     # start Postgres + Redis (or pnpm docker:dev for the full stack)'
Write-Host '  pnpm dev              # run the web app   (pnpm dev:api for the API)'
Write-Host ''
Write-Host 'Docs: README.md, INSTALL.md, docs/ENVIRONMENT.md'
