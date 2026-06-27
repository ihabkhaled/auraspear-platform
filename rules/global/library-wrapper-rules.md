# Library-wrapper rules — every external library and provider is wrapped

> **Read `AGENTS.md` first** (repo root) for the AI loading order. Then read the
> app's `CLAUDE.md`. GOD MODE §6.10 (integration adapters) and §4 (boundaries)
> are the source. This file is the **hard constraint**: AuraSpear never lets a
> raw third-party library spread across the codebase — it gets one wrapper, and
> everything imports the wrapper. Where a rule maps to a CLAUDE.md rule number,
> that number is authoritative.

A wrapper gives one place to: pin behavior, swap implementations, add tenancy/
redaction/SSRF/logging, and keep vendor details out of domain logic. An
un-wrapped `import` of a third-party lib in feature code is a violation even if
it works. Related: `monorepo-boundaries.md` (apps → packages, SDK-free
`packages/ai`), `../backend/integration-rules.md` (connector/AI provider
adapters in depth), `../frontend/component-rules.md` §2 (UI wrappers).

---

## 1. Frontend — wrap the library, import the wrapper

- **HTTP: never import `axios` in a component/hook/service.** Use the
  pre-configured instance from `@/lib/api` (`apps/web/src/lib/api.ts`) — it owns
  the base URL, auth/token-refresh interceptors, and the `X-Tenant-Id` tenant-
  switch header. Components never call the backend directly anyway; they go
  through `src/app/api/` proxy routes (`apps/web/CLAUDE.md` rule 33;
  `../frontend/api-client-rules.md`).
- **Dates: never `import dayjs` directly.** Use `@/lib/dayjs`
  (`apps/web/src/lib/dayjs.ts`) — `formatDate`, `formatTimestamp`,
  `formatRelativeTime`, `nowISO`, `todayDate`, `uniqueId`, `sortByDate*`. Raw
  `new Date().toISOString()` / `.getTime()` is replaced by these
  (`apps/web/CLAUDE.md` "Common Utilities").
- **Toasts: never call `sonner` directly.** Use `Toast` from
  `@/components/common` (`Toast.success/error/warning/info`)
  (`apps/web/src/components/common/Toast.tsx`; `apps/web/CLAUDE.md` "Toast").
- **Confirm dialogs: never call `sweetalert2` directly.** Use `SweetAlertDialog`
  from `@/components/common`
  (`apps/web/src/components/common/SweetAlert.tsx`).
- **Virtualized lists: never import `react-virtuoso`'s `Virtuoso` in a
  component.** Use `VirtualizedList` from `@/components/common`
  (`apps/web/src/components/common/VirtualizedList.tsx`) — this is rule **#63**
  verbatim, and the general rule: **wrap any third-party UI lib in
  `@/components/common/` first** (`apps/web/CLAUDE.md` rule 63). The same goes
  for charts, `clsx`/CVA (`cn()` from `@/lib/utils`), etc.
- **Barrel imports only** — `@/components/ui`, `@/components/common`, `@/hooks`,
  `@/services`, never a deep subpath (`apps/web/CLAUDE.md` rule 29).

## 2. Backend — wrap the SDK/client in an adapter or utility

- **Logging: use `ServiceLogger`** (`apps/api/src/common/services/service-logger.ts`)
  or the NestJS `Logger`, never raw `console.log` (`apps/api/CLAUDE.md` rule 6;
  `clean-code-rules.md` §2).
- **Redis: go through `RedisModule`** (`apps/api/src/redis/redis.module.ts`),
  reusing one shared connection — never `new Redis()` per request
  (`apps/api/CLAUDE.md` rule 47). `TokenBlacklistService` and the job processor
  consume it.
- **Dates: use `date-time.utility.ts`** (`apps/api/src/common/utils/`) —
  `nowMs()` etc.; raw `Date.now()` is banned (`apps/api/CLAUDE.md` ESLint:
  `prefer-date-now` off, with the rule that raw `Date.now()` is replaced by the
  utility).
- **Encryption: use `encryption.utility.ts`** for AES-256-GCM at rest — never
  call `node:crypto` ciphers ad-hoc (`apps/api/CLAUDE.md` "Key Principles" #4,
  rule 57; `../security/security-rules.md` §11).
- **Outbound integrations: wrap every provider in a connector adapter service**
  under `apps/api/src/modules/connectors/services/` (`wazuh.service.ts`,
  `misp.service.ts`, `bedrock.service.ts`, `shuffle.service.ts`,
  `llm-apis.service.ts`, `openclaw-gateway.service.ts`, …). The provider SDK lives
  only inside its adapter; domain services depend on the adapter, not the SDK
  (`apps/api/CLAUDE.md` rule 39; `../backend/integration-rules.md`;
  `../../skills/backend/add-connector.md`).
- **Audit/redaction wrappers stay centralized:** mutations are auto-audited by
  `audit.interceptor.ts` and run through `redactSensitiveFields()` /
  `redaction.constants.ts` (`apps/api/CLAUDE.md` rule 66) — a new credential
  field is added to `SENSITIVE_KEYS`, not handled inline.

## 3. AI providers and the safety layer are wrapped twice over

- **No raw vendor SDK in domain code.** AI providers are reached only through the
  cascade adapters (`bedrock → llm_apis → openclaw_gateway → rule-based`); never
  hardcode one provider or call its SDK from a service
  (`apps/api/CLAUDE.md` rules 88, 89; `../ai/ai-safety-rules.md`).
- **The provider-agnostic primitives live in `packages/ai`** (`redact()`,
  `evaluateApproval()`, `routeProviders`) and are **SDK-free by construction**
  (`monorepo-boundaries.md`). Keep the policy in the package; keep the SDK in the
  adapter. Never import a vendor SDK into `packages/ai`.

## 4. Why a single wrapper matters — and the divergence to avoid

- One wrapper = one place to pin, swap, add cross-cutting concerns, and test. An
  un-wrapped library scattered across N files is N migration points and N places
  for a vendor quirk to leak.
- **The cautionary tale is PKG-01:** the AI action-category contract was copied
  rather than centralized, and the copies diverged in their string values
  (`apps/api` underscores vs `packages/ai` hyphens) — a correctness landmine
  (`monorepo-boundaries.md` §4; `docs/audit/architecture-clean-code-audit.md`
  PKG-01). Wrap/centralize once; don't fork.

---

## Self-check before you commit

- [ ] No direct `axios` / `dayjs` / `sonner` / `sweetalert2` / `react-virtuoso`
      import in a frontend component/hook/service — used the `@/lib/*` or
      `@/components/common` wrapper.
- [ ] No raw `console.log`, `new Redis()`, ad-hoc crypto, or raw `Date.now()` in
      backend — used `ServiceLogger`, `RedisModule`, `encryption.utility.ts`,
      `date-time.utility.ts`.
- [ ] New outbound integration added as a connector adapter; provider SDK stays
      inside the adapter; domain code depends on the adapter.
- [ ] AI calls go through the cascade; no vendor SDK in `packages/ai`.
- [ ] No new divergent copy of a wrapped contract (esp. `AiActionCategory`).
- [ ] Barrel imports only (frontend); gates green (`validation-gates.md`);
      branched first (`branch-safety.md`).
