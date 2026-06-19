# AI-UI rules — every AI surface is provenance-aware, safe, and dismissible

> **Read `AGENTS.md` first** (repo root) for the loading order and the one rule:
> _no AI agent may edit first and understand later._ Then read `apps/web/CLAUDE.md`
> — it holds the enforced frontend rules (notably **41–61**) and the "AI Connector
> Strategy" / "Components — MUST USE" sections this file summarizes. Where this
> file and `apps/web/CLAUDE.md` overlap, the **CLAUDE.md rule number is
> authoritative**. Also read `../ai/` (AI-safety rules) and the recipe
> `../../skills/frontend/add-ai-panel.md` before building an AI panel.

These are **hard constraints** for any UI that displays AI output or triggers an
AI action — under `apps/web/src/components/ai-*/**`,
`apps/web/src/components/common/Ai*.tsx`, `apps/web/src/components/ai-renderer/**`,
and any page that renders an AI panel. They sit on top of the general
`component-rules.md` (`.tsx` is render-only) and `hook-service-rules.md` (AI calls
go through hooks/services, never components). An AI surface that breaks a rule
below is wrong even if it renders.

Provenance and safety are non-negotiable: `AGENTS.md §7` requires AI output to
carry **provenance** (provider/model/confidence), forbids rendering **raw AI
output as HTML**, and makes destructive actions **approval-required**. This file
makes those invariants concrete for the UI layer.

---

## 1. Every AI surface shows loading / error / confidence / provider / regenerate

`apps/web/CLAUDE.md` rule **42**: every AI-enabled UI surface MUST show **all five**:

1. **Loading state** — a spinner/skeleton while the request is in flight. Drive it
   off the AI hook's `isLoading`/`isFetching`, never a local `useState` in `.tsx`
   (`component-rules.md §1`). `AiResultCard` (`@/components/common`) already renders
   the loading branch off its `isLoading` prop — prefer it over a hand-rolled card.
2. **Error state** — a visible, retryable error using semantic classes
   (`text-status-error` / `bg-status-error`, never `text-red-*`). Surface the
   message via `Toast.error(t(getErrorKey(error)))` (`@/components/common` +
   `@/lib/api-error`) or an inline alert; never display the raw backend message
   (`apps/web/CLAUDE.md` Security rule 40).
3. **Confidence score (when available)** — render it as a badge.
   `AiResultCard` shows `result.confidence` as a percentage badge; for DataTable
   columns use `renderConfidenceBadge` from `@/lib/column-renderers`. Do not invent
   a confidence value when the response omits it — omit the badge.
4. **Provider attribution** — show `result.provider ?? result.model` (which
   connector answered: `bedrock` / `llm_apis` / `openclaw_gateway`, or
   `model: 'rule-based'` for the fallback per `apps/web/CLAUDE.md` rule 30). Users
   must always know whether a real model or the rule-based fallback responded.
5. **Regenerate affordance** — a "regenerate" control that re-invokes the same AI
   hook. Wire its `onClick` to the hook's mutate/refetch; the `.tsx` only renders
   the button (`component-rules.md §1`).

These five states live in the **hook's return value** (`component-rules.md §1`,
rule 60: components receive ready-to-render values). The page-level hook
(`src/hooks/useAi*.ts`) returns `{ result, isLoading, error, confidence, provider,
onRegenerate, onDismiss, ... }`; the component just renders them.

## 2. Never render raw AI output as HTML (security invariant)

`react/no-danger` is ESLint **error** and `apps/web/CLAUDE.md` rules **36 & 43**
are absolute: **no `dangerouslySetInnerHTML`** with AI content (or any content).
There is currently zero `dangerouslySetInnerHTML` in the codebase — keep it that way.

- Render AI text as **plain text** (e.g. `AiResultCard` uses
  `whitespace-pre-wrap`) or as **markdown via a safe renderer** — never as HTML.
- If markdown rendering is added, it must sanitize (DOMPurify) and must not enable
  raw-HTML passthrough (`apps/web/CLAUDE.md` Security rule 36). Code blocks,
  links, and tables only — no script/style/iframe.
- **Never render raw inter-agent JSON** in user-facing UI — transform it to
  human-readable first (`apps/web/CLAUDE.md` rule **58**). Raw orchestrator/agent
  hand-off JSON is for `src/components/ai-transcripts/` debug views only, and even
  there it is escaped text, never HTML.

## 3. Structured AI blocks → `ai-renderer` components only

`apps/web/CLAUDE.md` rule **53**: every rich/structured AI output block (risk
gauges, IOC tables, MITRE ATT&CK maps, timelines, attack-path graphs) MUST use a
**standardized renderer component from `apps/web/src/components/ai-renderer/`**.
No inline ad-hoc rendering of structured AI output.

- The `ai-renderer/` directory is the **single home** for these blocks. If it does
  not exist yet, create it there — do not scatter renderers into feature folders.
- For simple single-value AI results use the existing `AiResultCard` from
  `@/components/common` (confidence + provider badges built in). For richer blocks,
  add a dedicated component under `ai-renderer/` and barrel it.
- The output format the backend declares (`AiOutputFormat` in
  `src/enums/ai-config.enum.ts`: `STRUCTURED_JSON` / `MARKDOWN` / `RICH_CARDS` /
  `PLAIN_TEXT`) selects the renderer — never branch on a raw string literal
  (`apps/web/CLAUDE.md` rule 17; enums only).
- Renderers obey `component-rules.md §1`: `.tsx` is render-only; mapping the
  AI payload into render-ready props happens in the hook or a
  `src/lib/<domain>.utils.ts` mapper, not in the component.

## 4. Label every AI action category — and badge approval-required actions

`apps/web/CLAUDE.md` rule **44**: every AI action category MUST be **visually
labeled** as one of: `analysis-only`, `suggested`, `approval-required`,
`auto-allowed`, using an **`AiActionCategory` enum** (lives in `src/enums/`,
barrel-exported from `src/enums/index.ts` — never string literals, rule 17). This
mirrors `AGENTS.md §7`: **AI may analyze and suggest, but destructive
security/infra actions are approval-required** and need a persisted approval +
permission.

- **`analysis-only` / `suggested`** — read-only insight or a proposal the analyst
  can accept. Render with a neutral/info badge.
- **`approval-required`** — a destructive or state-changing action that **must
  not execute from the UI without an approval**. `apps/web/CLAUDE.md` rule **59**:
  every approval-required AI action MUST show an **approval-status badge**, and
  pending approvals must be **visually distinct**. Drive the badge off the
  `ApprovalStatus` enum (`src/enums/ai-config.enum.ts`:
  `PENDING` / `APPROVED` / `REJECTED` / `EXPIRED`) and use the `AiAutomationBadge`
  (`@/components/common`) pattern. The "execute"/"apply" control is **disabled
  until `APPROVED`**; the frontend never fabricates approval — the backend
  persists the `ApprovalRequest` (`apps/api/CLAUDE.md` rule 97).
- **`auto-allowed`** — safe, non-destructive automation; still labeled so the
  analyst knows it ran without review.
- Apply/Dismiss on AI findings (`AiFindingsPanel`, `useAiFindings*` hooks) follows
  the same gate: status comes from `AiFindingStatus` (`src/enums/ai-finding.enum.ts`:
  `PROPOSED` / `APPLIED` / `DISMISSED` / `FAILED`), and an "apply" that mutates
  security state is `approval-required`, not `auto-allowed`.

## 5. No AI transcripts / responses in localStorage

`apps/web/CLAUDE.md` rule **46**: **never store AI responses in `localStorage`** —
transcripts may contain alert data, IOCs, or PII. Use **server-side session
storage only** (`apps/web/CLAUDE.md` Security rule 35 forbids storing sensitive
data in `localStorage` without encryption).

- The only Zustand stores allowed to persist to `localStorage` are the existing
  `auth.store.ts` (`auth-storage`), `tenant.store.ts` (`tenant-storage`), and
  `ai-connector.store.ts` (`ai-connector-storage`, holds only the **selected
  connector id**, not responses). **Do not add an AI-chat/transcript/findings
  store to the `persist` list.** AI chat/transcript history is fetched per request
  via the AI hooks (`useAiChat`, `useAiTranscripts`, `useAiFindings`) from the BFF.
- Likewise **never store OSINT API keys** in frontend state or `localStorage`
  (`apps/web/CLAUDE.md` rule **55**) — keys are sent to the backend for AES-256-GCM
  encrypted storage only (`AGENTS.md §6`).

## 6. Connector selection is dynamic and self-contained

- **Connector dropdowns fetch from the backend**, never static enum iteration
  (`apps/web/CLAUDE.md` rule **45**): the list comes from
  `/api/connectors/ai-available` (proxy route exists at
  `apps/web/src/app/api/connectors/ai-available/route.ts`) via
  `useAvailableAiConnectors` (`@/hooks`). This reflects which connectors are
  actually enabled/healthy (`apps/web/CLAUDE.md` "AI Connector Strategy").
- **`<AiConnectorSelect />` (`@/components/common`) renders with zero props** — it
  reads `connectorValue` from `useAiConnectorStore` internally
  (`apps/web/CLAUDE.md` rule **61**, `component-rules.md §2`). Never pass
  `availableConnectors` / `selectedConnector` / `onConnectorChange`. AI hooks read
  the selected connector from the store directly.

## 7. AI calls go through hooks — and every panel is dismissible & cataloged

- **Components never call AI services directly** — all AI calls go through
  dedicated hooks in `src/hooks/useAi*.ts` that own loading/error/permission state
  (`apps/web/CLAUDE.md` rule **41**, `hook-service-rules.md`). The `.tsx` renders;
  the hook calls the service; the service calls the proxy route.
- **Every AI panel has a dismiss/close affordance** — AI suggestions must never
  block the analyst workflow (`apps/web/CLAUDE.md` rule **47**). Wire `onDismiss`
  from the hook; never trap focus or gate the page on an AI response.
- **Register the surface in the AI feature catalog first** — a new AI surface must
  exist as an `AiFeatureKey` (`src/enums/ai-config.enum.ts`) and be configured in
  the backend AI feature catalog **before** you build the panel
  (`apps/web/CLAUDE.md` rule **49**).
- **Enums, not string literals**, for all AI identifiers: `AiAgentId`,
  `AiTriggerMode`, `AiOutputFormat`, `ApprovalStatus`, `AiFeatureKey`,
  `AiActionCategory` from `@/enums` — never `'orchestrator'`, `'pending'`,
  `'approval-required'`, etc. (`apps/web/CLAUDE.md` rules **17, 50, 51, 52**).

## 8. RBAC, tenancy, and i18n still apply

- An AI surface is gated by the same RBAC the backend enforces: the proxied
  endpoint carries `@RequirePermission(...)` (`apps/api/CLAUDE.md` rule 25), and the
  AI hook reflects permission state so the UI hides/disables actions the user
  cannot perform. AI investigation is tenant-scoped end to end (`AGENTS.md §6–7`,
  `apps/api/CLAUDE.md` rule 48) — the UI never sends a tenant override beyond the
  GLOBAL_ADMIN `X-Tenant-Id` switch already handled by the Axios interceptor.
- **All AI-surface text is `t()`** — labels, the five state messages, category and
  approval badge labels, confidence units, regenerate/dismiss buttons — in all 6
  locale files (`en`, `es`, `it`, `fr`, `ar`, `de`), using logical RTL properties
  (`start`/`end`) per `component-rules.md §§5–6` and `apps/web/CLAUDE.md` rule 9.

---

### Quick gate

Before you commit an AI surface, confirm: (1) it shows **all five** — loading,
error, confidence (when present), provider, regenerate — driven from the hook, not
local `.tsx` state; (2) **no `dangerouslySetInnerHTML`**; AI text is plain
text/safe markdown, structured blocks use `src/components/ai-renderer/`, no raw
inter-agent JSON; (3) the action category is labeled via `AiActionCategory`, and
approval-required actions show an `ApprovalStatus` badge and stay disabled until
`APPROVED`; (4) **no AI transcript/response/OSINT key in `localStorage`**; (5)
connector dropdown is `<AiConnectorSelect />` (zero props) fed by
`/api/connectors/ai-available`; (6) the panel has a dismiss affordance, the AI call
goes through a `useAi*` hook, and the surface is registered as an `AiFeatureKey`.
Then run `pnpm lint` and `pnpm typecheck` — don't claim green until both pass
(`../global/validation-gates.md`).
