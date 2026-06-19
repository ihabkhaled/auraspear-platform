# Skill — Add an AI Panel / Surface (`apps/web`)

> **Read `AGENTS.md` first** (repo root): loading order (§1), security
> invariants (§6 — tenant isolation, RBAC, no auth/secret bypass), **AI safety
> (§7 — provenance, never render raw AI HTML, destructive = approval-required)**,
> validation gates (§5), and the "never claim green without running it" rule
> (§5/§13). Then read the hard rules that govern this task:
> **`rules/frontend/ai-ui-rules.md`** (the authority for AI surfaces — the
> CLAUDE.md rule number wins on any overlap), `rules/frontend/component-rules.md`
> (`.tsx` is render-only), `rules/frontend/hook-service-rules.md` (AI calls go
> through hooks/services), `rules/global/validation-gates.md`, and
> **`apps/web/CLAUDE.md`** rules **41–61** plus the "AI Connector Strategy" and
> "Components — MUST USE" sections. Sibling onboarding dirs: `rules/`, `skills/`
> (you are here), `memory/` (`AI_MEMORY.md`, `SECURITY_MEMORY.md`), `context/`,
> `docs/` (`docs/AI.md`, `docs/ai/`). Companion recipes:
> `skills/frontend/add-hook.md`, `skills/frontend/add-page.md`,
> `skills/frontend/add-component.md`, and the **backend** side of an AI feature
> (the feature catalog + endpoint) per `AGENTS.md §11` (`skills/ai/add-ai-feature.md`)
> and `skills/backend/add-endpoint.md`.

This recipe adds a UI surface that **displays AI output or triggers an AI
action** (a panel, drawer, card, tab, or modal). Every such surface in this repo
must: show **loading / error / confidence / provider / regenerate**; **never
render raw AI output as HTML**; route structured output through
`src/components/ai-renderer/`; call the model only via a **`useAi*` hook**; label
its **action category**; be **dismissible**; and be **registered in the AI
feature catalog** before it ships. These are enforced (`apps/web/CLAUDE.md`
**#41–#61**), not stylistic.

---

## When to use

Use this skill when you are building, in `apps/web`, any of:

- An **AI panel/drawer/tab** on a detail page (e.g. an alert/case/incident AI
  triage panel like `apps/web/src/components/common/AiFindingsPanel.tsx` or the
  `useAiAlertTriage` triage card).
- An **AI result card** that shows a single model answer (reuse
  `AiResultCard` from `@/components/common` —
  `apps/web/src/components/common/AiResultCard.tsx`).
- A **rich/structured AI block** (risk gauge, IOC table, MITRE ATT&CK map,
  timeline, attack-path graph) → a new component under
  `apps/web/src/components/ai-renderer/` (`apps/web/CLAUDE.md` **#53**).
- A surface that triggers an **AI action** (apply a suggestion, run an agent
  task, draft a rule/playbook) — which adds the approval-category requirements.

Do **not** use this skill for a non-AI panel (use `add-component.md` +
`add-hook.md`), and do **not** call an AI service from a `.tsx` or a page hook
directly — that is `apps/web/CLAUDE.md` **#41**. The backend AI endpoint, its
`@RequirePermission`, and the feature-catalog entry are a **prerequisite**: build
them first via `skills/ai/add-ai-feature.md` + `skills/backend/add-endpoint.md`.

---

## Files to inspect first

Read these real files before writing anything — they are the patterns you copy:

| Concern                                          | Path                                                                                                                                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI-UI hard rules (authority)                     | `rules/frontend/ai-ui-rules.md`                                                                                                                                                                           |
| `.tsx` render-only / hook rules                  | `rules/frontend/component-rules.md`, `rules/frontend/hook-service-rules.md`                                                                                                                               |
| Reusable single-result card (5 states reference) | `apps/web/src/components/common/AiResultCard.tsx`                                                                                                                                                         |
| Findings panel + apply/dismiss gate              | `apps/web/src/components/common/AiFindingsPanel.tsx`, `apps/web/src/components/ai-findings/FindingDetailDrawer.tsx`                                                                                       |
| Approval / automation badge                      | `apps/web/src/components/common/AiAutomationBadge.tsx`                                                                                                                                                    |
| Connector dropdown (zero-prop)                   | `apps/web/src/components/common/AiConnectorSelect.tsx`                                                                                                                                                    |
| Canonical `useAi*` hook to copy                  | `apps/web/src/hooks/useAiAlertTriage.ts` (permission gate + connector from store + mutation + `buildErrorToastHandler`)                                                                                   |
| Feature-catalog hooks (read catalog state)       | `apps/web/src/hooks/useAiFeatures.ts`, `apps/web/src/hooks/useAiFindingsPanel.ts`                                                                                                                         |
| Connector list hook                              | `apps/web/src/hooks/useAvailableAiConnectors.ts`                                                                                                                                                          |
| Frontend AI enums (mirror of backend)            | `apps/web/src/enums/ai-config.enum.ts` (`AiFeatureKey`, `AiOutputFormat`, `ApprovalStatus`, `AiApprovalLevel`), `apps/web/src/enums/ai-finding.enum.ts`, `apps/web/src/enums/permission.enum.ts` (`AI_*`) |
| **Backend source of truth** for keys/categories  | `apps/api/src/common/enums/ai-feature.enum.ts` (`AiFeatureKey`, `AiApprovalLevel`, **`AiActionCategory`**)                                                                                                |
| Backend feature catalog (register here)          | `apps/api/src/modules/ai/feature-catalog/feature-catalog.constants.ts`, `.service.ts`, `.controller.ts`                                                                                                   |
| Proxy route patterns                             | `apps/web/src/app/api/ai-features/route.ts`, `apps/web/src/app/api/connectors/ai-available/route.ts` (both use `proxyToBackend`)                                                                          |
| Result card type shape                           | `apps/web/src/types/common.types.ts` (`AiResultCardResult`, `AiResultCardProps`)                                                                                                                          |

> **Two gaps to know up front** (the repo is mid-build): the directory
> `apps/web/src/components/ai-renderer/` **does not exist yet** — create it the
> first time you add a structured renderer (do not scatter renderers into feature
> folders, `apps/web/CLAUDE.md` **#53**). And **`AiActionCategory` exists only in
> the backend** (`apps/api/src/common/enums/ai-feature.enum.ts`) — it is **not yet
> mirrored** into `apps/web/src/enums/`. If your surface triggers an action, you
> must add the frontend mirror enum (Step 3) so you never use a string literal
> (`apps/web/CLAUDE.md` **#17, #44**).

---

## Exact step-by-step implementation

### Step 0 — Branch and confirm the backend prerequisite

1. Branch first (`AGENTS.md §8`): `git checkout -b feat/ai-<surface>` — never work
   on `main`/`master`.
2. Confirm the AI feature already exists end-to-end on the backend: a key in
   `AiFeatureKey` (`apps/api/src/common/enums/ai-feature.enum.ts`), a catalog entry
   (`feature-catalog.constants.ts`), a controller endpoint carrying
   `@RequirePermission(...)` and `@Throttle({ default: { limit: 10, ttl: 60000 } })`
   (AI endpoints are rate-limited, `apps/api/CLAUDE.md` #33), and the call routed
   through the AI connector cascade (`apps/api/CLAUDE.md` #88). If it does not
   exist, stop and build it via `skills/ai/add-ai-feature.md` first — the panel is
   the last layer.

### Step 1 — Register the surface in the AI feature catalog (do this BEFORE the panel)

`apps/web/CLAUDE.md` **#49**: every new AI surface MUST be a catalogued feature
_before_ you implement it.

1. **Backend enum** — add the `AiFeatureKey` member in
   `apps/api/src/common/enums/ai-feature.enum.ts` (e.g.
   `CASE_RISK_EXPLAIN = 'case.risk_explain'`). Value is the dotted key.
2. **Backend catalog** — add the feature's default config (enabled, preferred
   provider, `maxTokens`, `approvalLevel` from `AiApprovalLevel`, action category
   from `AiActionCategory`, output format) in
   `apps/api/src/modules/ai/feature-catalog/feature-catalog.constants.ts` /
   `feature-catalog.service.ts`, matching the existing entries' shape.
3. **Frontend mirror enum** — add the same member to `AiFeatureKey` in
   `apps/web/src/enums/ai-config.enum.ts` (the two enums must stay in sync; the
   frontend file is the mirror).
4. Keep both enum lists in the **same dotted-string order** so reviewers can diff
   them.

### Step 2 — Add the proxy route (every backend endpoint the UI calls needs one)

`apps/web/CLAUDE.md` **#33/#86**: every backend endpoint the frontend calls needs
a matching Next.js proxy route, or you get a 404 HTML response.

1. Create `apps/web/src/app/api/<feature-path>/route.ts` mirroring the backend
   path, using **`proxyToBackend`** exactly like
   `apps/web/src/app/api/ai-features/route.ts`:
   ```ts
   import { type NextRequest } from 'next/server'
   import { proxyToBackend } from '@/lib/backend-proxy'
   export const dynamic = 'force-dynamic'
   export async function POST(request: NextRequest) {
     return proxyToBackend(request, { path: '/ai/<feature-path>' })
   }
   ```
2. **Never** forward client role/auth headers (`apps/web/CLAUDE.md` Security #41) —
   `proxyToBackend` is the only way the call reaches the BFF; the backend re-checks
   `@RequirePermission` and tenant scope.
3. The connector dropdown already has its proxy at
   `apps/web/src/app/api/connectors/ai-available/route.ts` — reuse it; do not add a
   second connector list source (`apps/web/CLAUDE.md` **#45**).

### Step 3 — Add/extend enums (no string literals anywhere)

`apps/web/CLAUDE.md` **#17, #44, #50–#52**: all AI identifiers are enums.

1. If the surface triggers an action, **mirror `AiActionCategory`** into
   `apps/web/src/enums/ai-config.enum.ts` (it is backend-only today):
   ```ts
   export enum AiActionCategory {
     ANALYSIS_ONLY = 'analysis_only',
     SUGGESTED = 'suggested',
     APPROVAL_REQUIRED = 'approval_required',
     AUTO_ALLOWED = 'auto_allowed',
   }
   ```
   Then export it from `apps/web/src/enums/index.ts`.
2. Reuse existing enums — `ApprovalStatus` and `AiApprovalLevel`
   (`ai-config.enum.ts`), `AiFindingStatus`/`AiFindingType` (`ai-finding.enum.ts`),
   `AiOutputFormat`, `AiAgentId`, `AiTriggerMode` — never `'pending'`,
   `'approval_required'`, `'orchestrator'`, etc.
3. Pick the **`Permission`** member that guards the backend endpoint from
   `apps/web/src/enums/permission.enum.ts` (e.g. `AI_ALERT_TRIAGE`,
   `AI_CASE_COPILOT`, `AI_DETECTION_COPILOT`). If you added a new permission,
   follow the full end-to-end permission recipe (`apps/web/CLAUDE.md` **#34**,
   `apps/api/CLAUDE.md` #85) — do **not** ship a half-wired permission.

### Step 4 — Add types and the service method

Declarations must live in their home files (`apps/web/CLAUDE.md` **#13**) — never
inline in the hook, service, or `.tsx`.

1. Add the AI result/response interface to `apps/web/src/types/<domain>.types.ts`
   (re-use `AiResultCardResult` from `common.types.ts` for simple
   `{ result?, confidence?, provider?, model? }` answers) and barrel it from
   `apps/web/src/types/index.ts`.
2. Add a service method on the relevant singleton in `apps/web/src/services/`
   (e.g. `ai-agent.service.ts`, `alert.service.ts`) that calls the Axios instance
   from `@/lib/api` against your **proxy** path and passes the optional
   `connectorValue`. Services are the **only** place Axios is called; barrel from
   `services/index.ts`.

### Step 5 — Write the `useAi*` hook (the brain of the surface)

This is the only place the AI service may be called (`apps/web/CLAUDE.md` **#41**,
`hook-service-rules.md`). Copy `apps/web/src/hooks/useAiAlertTriage.ts`. One hook
per file in `apps/web/src/hooks/`, barrel-exported from `hooks/index.ts`
(`apps/web/CLAUDE.md` **#14**).

The hook owns and **returns ready-to-render values** (`apps/web/CLAUDE.md` **#60**)
for all **five mandated states** plus dismiss/category (`apps/web/CLAUDE.md`
**#42, #44, #47**):

```ts
'use client'
import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { AiActionCategory, Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { aiAgentService } from '@/services'
import { useAiConnectorStore, useAuthStore } from '@/stores'
import type { AiResultCardResult } from '@/types'

export function useAiCaseRiskPanel(caseId: string) {
  const t = useTranslations('ai')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)
  const canRun = hasPermission(permissions, Permission.AI_CASE_COPILOT)

  const selectedConnector = useAiConnectorStore(s => s.selectedConnector)
  const connectorValue = selectedConnector === 'default' ? undefined : selectedConnector

  const [result, setResult] = useState<AiResultCardResult | null>(null)
  const mutation = useMutation({
    mutationFn: () => aiAgentService.caseRiskExplain(caseId, connectorValue),
    onSuccess: setResult,
    onError: buildErrorToastHandler(tErrors),
  })

  const onRegenerate = useCallback(() => mutation.mutate(), [mutation])
  const onDismiss = useCallback(() => setResult(null), [])

  return {
    t,
    canRun,
    result, // { result, confidence, provider, model }
    confidence: result?.confidence, // badge only when present
    provider: result?.provider ?? result?.model,
    category: AiActionCategory.ANALYSIS_ONLY, // label every surface
    isLoading: mutation.isPending, // loading state
    isError: mutation.isError, // error state
    onRegenerate, // regenerate affordance
    onDismiss, // dismiss affordance
  }
}
```

Rules baked into the hook: permission via `hasPermission(permissions, Permission.*)`;
connector read from `useAiConnectorStore` (**never** passed as a prop,
`apps/web/CLAUDE.md` **#61**); errors via `buildErrorToastHandler(tErrors)` so the
**raw backend message is never shown** (`apps/web/CLAUDE.md` Security #40); the
five states all returned. **Never** store the result in `localStorage`
(`apps/web/CLAUDE.md` **#46**) — keep it in hook state / refetch from the BFF.

### Step 6 — Build the render-only `.tsx` panel

The component renders JSX only — **zero hook calls in the `.tsx`**
(`apps/web/CLAUDE.md` **#16**); it receives values from the page hook (which calls
your `useAi*` hook). Place feature-specific panels under the matching
`apps/web/src/components/<domain>/` folder; **structured AI blocks go under
`apps/web/src/components/ai-renderer/`** (create the dir + an `index.ts` barrel if
absent, `apps/web/CLAUDE.md` **#53**).

The panel must visibly render **all five states + category + dismiss**:

- **Loading** — spinner/skeleton off `isLoading` (reuse `AiResultCard`'s
  `isLoading` branch, or `<LoadingSpinner />` from `@/components/common`).
- **Error** — inline alert using **semantic classes only**
  (`text-status-error` / `bg-status-error border-status-error`, never
  `text-red-*`, `apps/web/CLAUDE.md` Styling rules).
- **Confidence** — badge **only when present** (`renderConfidenceBadge` from
  `@/lib/column-renderers` for tables; `AiResultCard` already does the
  percentage badge). Never fabricate a number.
- **Provider** — show `provider ?? model` so the analyst knows whether a real
  model or the `rule-based` fallback answered (`apps/web/CLAUDE.md` rule 30).
- **Regenerate** — `<Button … onClick={onRegenerate}>` (button from
  `@/components/ui`, label via `t()`).
- **Category badge** — drive off `AiActionCategory`; for `APPROVAL_REQUIRED`
  surfaces add an **`ApprovalStatus` badge** via the `AiAutomationBadge` pattern,
  and **disable the execute/apply control until `APPROVED`**
  (`apps/web/CLAUDE.md` **#44, #59**; `AGENTS.md §7`).
- **Dismiss/close** — an always-present close affordance wired to `onDismiss`;
  the AI panel must never block the workflow (`apps/web/CLAUDE.md` **#47**).
- **AI text rendering** — render as **plain text** (`whitespace-pre-wrap`, like
  `AiResultCard`) or **safe sanitized markdown**. **Never**
  `dangerouslySetInnerHTML` (`react/no-danger` is ESLint **error**;
  `apps/web/CLAUDE.md` **#43**, Security #36). **Never** render raw inter-agent
  JSON (`apps/web/CLAUDE.md` **#58**).
- **Connector picker** (if the surface lets the analyst choose) —
  `<AiConnectorSelect />` from `@/components/common` with **zero props**
  (`apps/web/CLAUDE.md` **#61**).

Quickest path for a single answer: render `<AiResultCard result={result}
isLoading={isLoading} label={t('label')} />` and add the regenerate + dismiss
buttons and category badge around it.

### Step 7 — Wire into the page via the page hook, and i18n every string

1. The page-level hook (`useXxxPage` / `useXxxDetailPage`) calls your `useAi*`
   hook and spreads its values; the page `.tsx` renders your panel with those
   values. The page `.tsx` calls **exactly one** page hook (`add-page.md`).
2. Every user-facing string — the 5 state labels, category/approval labels,
   confidence unit, regenerate/dismiss button text — goes through `t()` and is
   added to **all 6 locale files** `en/es/it/fr/ar/de.json`
   (`apps/web/CLAUDE.md` **#9**, i18n section; `rules/frontend/i18n-rules.md`).
   Use logical RTL props (`ps-*`, `me-*`, `text-start`).
3. New page route? It needs a Playwright test covering loaded/empty/error/
   responsive (`apps/web/CLAUDE.md` **#48**).

---

## Validation commands (real `pnpm` commands, run from repo root)

`pnpm` only, Node 22 (`AGENTS.md §4`). Run and read the output — **do not claim
green without running** (`AGENTS.md §5/§13`):

```bash
pnpm install                 # if deps changed
pnpm typecheck               # HARD GATE — must pass (AGENTS.md §5)
pnpm lint                    # AI-UI rules incl. react/no-danger, no-explicit-any, enum rules
pnpm format:check            # Prettier (no semicolons, single quotes)
pnpm build                   # HARD GATE — must build
pnpm test                    # advisory; run if you touched/added tested code
pnpm test:e2e                # if you added/changed a page route (Playwright, rule #48)
pnpm validate                # full bundle (typecheck + lint:strict + format:check)
pnpm dev                     # manual smoke: load the surface, hit regenerate, force an error
```

If you changed the backend feature/endpoint, also run the API gates from
`apps/api` (`pnpm typecheck`, `pnpm build`, and `npx prisma db seed` if a new
permission was seeded — `apps/api/CLAUDE.md` #85). **Hard gates** that must be
green: `pnpm typecheck` and `pnpm build` (`AGENTS.md §5`).

---

## Docs to update

- **`docs/AI.md`** and `docs/ai/` — add the new AI surface/feature to the AI
  subsystem docs (catalog key, action category, approval level, which
  connector/agent serves it).
- **`memory/AI_MEMORY.md`** — record the new `AiFeatureKey` and any new
  `Permission` so the next agent knows it exists.
- **`memory/DECISIONS_MEMORY.md`** / `docs/decisions/` — only if you made a
  non-obvious choice (new renderer type, new action category, approval policy).
- **i18n** — the 6 locale files are part of the change, not "docs", but verify
  every new key exists in all of `en/es/it/fr/ar/de.json`.
- If you created `apps/web/src/components/ai-renderer/`, note the new renderer in
  `rules/frontend/ai-ui-rules.md`'s scope list if it introduces a new block type.

---

## Security checks (before you commit — `AGENTS.md §6–§7`)

- [ ] **No raw AI HTML.** Zero `dangerouslySetInnerHTML` anywhere in the surface;
      AI text is plain text or **sanitized** markdown (DOMPurify, no raw-HTML
      passthrough). No raw inter-agent JSON rendered (`apps/web/CLAUDE.md`
      **#43, #58**, Security #36; `react/no-danger`).
- [ ] **RBAC enforced both ends.** The proxied endpoint carries
      `@RequirePermission(...)` (`apps/api/CLAUDE.md` #25); the hook gates the UI
      with `hasPermission(permissions, Permission.*)`. The UI gate is convenience
      only — the backend is the real boundary.
- [ ] **Tenant isolation intact.** No tenant id is sent beyond the existing
      GLOBAL_ADMIN `X-Tenant-Id` switch handled by the Axios interceptor; AI
      investigation is tenant-scoped on the backend (`apps/api/CLAUDE.md` #48).
- [ ] **No auth/secret/permission bypass.** No dev-mode shortcut, no client role
      header forwarded (`apps/web/CLAUDE.md` Security #41), no new permission left
      half-wired (`apps/web/CLAUDE.md` **#34**).
- [ ] **Destructive = approval-required.** Any state-changing/destructive AI
      action is labeled `APPROVAL_REQUIRED`, shows an `ApprovalStatus` badge, and
      its execute/apply control stays **disabled until `APPROVED`** — the frontend
      never fabricates approval; the backend persists the `ApprovalRequest`
      (`apps/web/CLAUDE.md` **#44, #59**; `apps/api/CLAUDE.md` #97; `AGENTS.md §7`).
- [ ] **No sensitive data in `localStorage`.** No AI transcript/response in
      `localStorage`; no OSINT API key in frontend state (`apps/web/CLAUDE.md`
      **#46, #55**). Only `auth-storage`/`tenant-storage`/`ai-connector-storage`
      persist, and the connector store holds **only the selected id**.
- [ ] **No raw backend errors shown.** Errors surface via
      `buildErrorToastHandler(tErrors)` / `t(getErrorKey(error))`, never the raw
      message (`apps/web/CLAUDE.md` Security #40).
- [ ] Connector list comes from `/api/connectors/ai-available`, never static enum
      iteration (`apps/web/CLAUDE.md` **#45**).

Consider running `/security-review` on the diff before pushing.

---

## Common mistakes

- **Calling the AI service from the `.tsx` or page hook directly.** Violates
  `apps/web/CLAUDE.md` **#41/#16** — all AI calls go through a dedicated
  `useAi*.ts` hook.
- **Showing only some of the five states.** A panel with no error branch, no
  provider badge, or no regenerate fails **#42**. Drive all five off the hook,
  not local `.tsx` `useState`.
- **`dangerouslySetInnerHTML` "just for markdown".** Hard fail (**#43**,
  `react/no-danger` error). Use plain text or a sanitized renderer.
- **Ad-hoc rendering of a risk gauge / IOC table / MITRE map inline.** Must live
  in `apps/web/src/components/ai-renderer/` (**#53**).
- **String literals for keys/categories/status.** `'approval_required'`,
  `'pending'`, `'orchestrator'`, `'case.risk_explain'` are all banned — use
  `AiActionCategory`, `ApprovalStatus`, `AiAgentId`, `AiFeatureKey`
  (**#17, #44, #50–#52**).
- **Forgetting the catalog registration.** Building the panel before the
  `AiFeatureKey` exists on **both** ends violates **#49** and leaves an orphan
  surface.
- **Missing proxy route.** Calling the backend without an
  `apps/web/src/app/api/.../route.ts` returns 404 HTML, not JSON (**#33/#86**).
- **Passing connector props to `<AiConnectorSelect />`.** It is zero-prop and
  store-driven (**#61**).
- **Fabricating a confidence number** when the response omits it — omit the badge
  instead (`rules/frontend/ai-ui-rules.md §1`).
- **`text-red-*` for the error state.** Use `text-status-error` /
  `bg-status-error` (Styling rules).
- **Persisting the AI result to `localStorage`** (**#46**) or rendering raw
  inter-agent JSON (**#58**).
- **Claiming green without running the gates** (`AGENTS.md §5/§13`).

---

## Final checklist

- [ ] Branch created (not `main`/`master`); backend AI endpoint + catalog entry
      prerequisite confirmed.
- [ ] `AiFeatureKey` added on **backend** (`ai-feature.enum.ts` + catalog
      constants/service) **and mirrored** in
      `apps/web/src/enums/ai-config.enum.ts` (**#49**).
- [ ] Proxy route added under `apps/web/src/app/api/...` via `proxyToBackend`
      (**#33/#86**).
- [ ] Enums used everywhere (no string literals); `AiActionCategory` mirrored to
      the frontend if the surface triggers an action; `Permission` chosen.
- [ ] Types in `src/types/<domain>.types.ts` (barrelled); service method added in
      `src/services/` (barrelled).
- [ ] `useAi*` hook added in `src/hooks/` (barrelled) — gates on
      `hasPermission`, reads connector from `useAiConnectorStore`, returns
      **loading + error + confidence + provider + onRegenerate + onDismiss +
      category**, errors via `buildErrorToastHandler`.
- [ ] Panel `.tsx` is render-only (zero hook calls), renders **all five states +
      category badge + dismiss**, uses `AiResultCard`/`ai-renderer` (no inline
      structured rendering), **no `dangerouslySetInnerHTML`**, semantic status
      classes, `<AiConnectorSelect />` zero-prop if used.
- [ ] Approval-required actions: `ApprovalStatus` badge shown, execute/apply
      disabled until `APPROVED` (**#44, #59**).
- [ ] No AI response/transcript/OSINT key in `localStorage`; no raw backend error
      shown; no raw inter-agent JSON.
- [ ] All strings via `t()` in **all 6** locale files; Playwright test added if a
      new page route was introduced (**#48**).
- [ ] Docs updated (`docs/AI.md`/`docs/ai/`, `memory/AI_MEMORY.md`).
- [ ] Ran and read output of `pnpm typecheck`, `pnpm lint`, `pnpm build`
      (+ `pnpm test`/`pnpm test:e2e`/`pnpm validate` as applicable). **Hard gates
      `typecheck` + `build` are green — confirmed by running them, not assumed.**

```
Branch:
Commits:
Files created:
Files updated:
Commands run:
Green checks:
Failed checks:
Blockers:
Risks:
Next steps:
```
