# Frontend i18n rules — `next-intl`, 6 locales, RTL

> **Read `AGENTS.md` first** (repo root) for the loading order and the one rule:
> _no AI agent may edit first and understand later._ Then read the **i18n**
> section of `apps/web/CLAUDE.md` (it holds rule 9 and the "Translation Rules")
> and `apps/api/CLAUDE.md` rule 49 (backend messageKey parity). Where this file
> and those CLAUDE.md files overlap, the CLAUDE.md rule number is authoritative.

These are **hard constraints** for any user-facing text under
`apps/web/src/**`. Hardcoded strings are an ESLint violation
(`apps/web/CLAUDE.md` rule 9) and block review. Related:
`component-rules.md` (§5 RTL, §6 text), `accessibility-rules.md`, and the
recipe `../../skills/frontend/add-page.md`.

---

## 1. The six locales — exact set, exact order

Source of truth: `apps/web/src/lib/constants/locales.ts`.

- `SUPPORTED_LOCALES = ['en', 'es', 'it', 'fr', 'ar', 'de']` — **en, ar, es, fr,
  de, it**. No more, no fewer. Adding a locale means adding it here **and** a new
  `src/i18n/<locale>.json` **and** an entry in `LOCALES`.
- Default locale is `en` (`DEFAULT_LOCALE`); default time zone is `UTC`
  (`DEFAULT_TIME_ZONE`).
- Locale is read from the `locale` cookie in `src/i18n/index.ts` and validated
  against `SUPPORTED_LOCALES`; an unknown value falls back to `en`. Never read
  the locale from anywhere else.

## 2. Every user-facing string goes through `t()` — no exceptions

`apps/web/CLAUDE.md` rule 9: **NEVER hardcode user-facing text.** This covers
labels, placeholders, tooltips, button text, table headers, empty-state copy,
toasts, `SweetAlertDialog` text, validation hints, and confirmation dialogs —
every scenario per "Translation Rules" #3.

- **Client components:** `const t = useTranslations('namespace')` — but per
  `component-rules.md` §1, **no hook calls live in `.tsx`**. Call
  `useTranslations` inside the page-level hook in `src/hooks/`, return the
  resolved strings (or `t` itself) to the component.
- **Server components:** `const t = await getTranslations('namespace')`.
- Both are imported from `next-intl` / `next-intl/server` (see the "Libraries"
  table in `apps/web/CLAUDE.md`). Never import a translation library directly
  anywhere else.
- A string that uses `t()` for error messages may keep its Zod schema inline in
  the component (the documented exception in `apps/web/CLAUDE.md` rule 18 +
  `component-rules.md` §1) because it depends on hook context.

## 3. Keys exist in ALL 6 locale files or not at all

Translation files live in `src/i18n/{en,ar,es,fr,de,it}.json`. All six currently
carry the **same 54 top-level namespaces** (`common`, `errors`, `roleSettings`,
…). A key added to one **must** be added to all six.

- **Never leave a placeholder or `TODO` translation** ("Translation Rules" #5).
  Provide a real translation in each of the 6 languages — not the English string
  copied into `ar.json`.
- **Namespace by module** ("Translation Rules" #4): `incidents.title`,
  `incidents.kpi.open`, `correlation.tabs.sigma`. Match the existing shape — do
  not invent a parallel flat key.
- A missing key throws/renders an error at runtime in that locale, so a key
  present in `en.json` but absent from `de.json` is a bug, not a warning.

## 4. Backend messageKeys mirror under `errors.*`

The backend never sends display text — it sends a **messageKey** string
(`apps/api/CLAUDE.md` rules 17–18, e.g. `errors.auth.invalidCredentials`),
shaped `errors.<module>.<specificAction>`. The frontend resolves it.

- Every backend `messageKey` **must** have a matching entry under the `errors`
  namespace in **all 6** frontend locale files (`apps/api/CLAUDE.md` rule 49;
  `apps/web/CLAUDE.md` "Translation Rules" #6). Backend and frontend keys are one
  vocabulary — they cannot drift.
- Resolve API errors with `getErrorKey(error)` from `@/lib/api-error.ts`. It
  strips the leading `errors.` prefix and returns a key for
  `useTranslations('errors')` — so `errors.incidents.notFound` becomes
  `incidents.notFound` under the `errors` namespace. Field-level keys come from
  `getFieldErrors()` / `getFirstFieldError()` in the same file.
- Standard toast pattern (`apps/web/CLAUDE.md` "Toast"):
  `Toast.error(t(getErrorKey(error)))` — or `buildErrorToastHandler(tErrors)`
  from `@/lib/toast.utils` in mutation `onError` callbacks (rule 62). Never write
  the inline `Toast.error(tErrors(getErrorKey(error)))` form by hand.
- **Security invariant:** show only `t(messageKey)` to users — never render the
  raw error message or internal details from the backend (`apps/web/CLAUDE.md`
  Security rule 40; `apps/api/CLAUDE.md` rule 77 sanitizes server-side too).

## 5. RTL — logical properties, never physical

Direction is set once: `src/app/layout.tsx` computes `dir = locale === 'ar' ?
'rtl' : 'ltr'` and applies it to `<html dir={dir}>` (and the Toaster position).
`ar` is the RTL locale; everything must flip automatically.

- **Use logical/`start`/`end` utilities, never physical `left`/`right`**
  (`apps/web/CLAUDE.md` "i18n"; `component-rules.md` §5): `ps-3` not `pl-3`,
  `me-2` not `mr-2`, `text-start` not `text-left`, `start-0`/`end-0` not
  `left-0`/`right-0`. A layout built with physical directions breaks Arabic.
- For the rare element that must rotate/translate by direction, use Tailwind's
  `rtl:` variant (as `Sidebar.tsx` and `ui/calendar.tsx` already do) — do **not**
  branch on the locale in JS to pick a class.

## 6. Don't reinvent formatting — and never render raw text as HTML

- **Dates/times** go through `@/lib/dayjs` (`formatDate`, `formatTimestamp`,
  `formatRelativeTime`, `nowISO`) — never `new Date()` formatting inline, never
  `import dayjs` directly (`apps/web/CLAUDE.md` "Libraries").
- **Interpolation** uses next-intl ICU placeholders (`t('key', { count })`),
  not template-literal string concatenation of translated fragments — that
  breaks word order across locales.
- **Never render translated or AI-produced text via `dangerouslySetInnerHTML`**
  (`react/no-danger` is `error`; `AGENTS.md` §7, `apps/web/CLAUDE.md` rules 36 &
  43; `component-rules.md` §7). Render as plain text or safe markdown.

## 7. Adding a permission/feature touches i18n in 6 files (end-to-end)

Per the end-to-end permission rule (`apps/web/CLAUDE.md` rule 34 step 9 /
`apps/api/CLAUDE.md` rule 85 step 8), a new permission needs i18n keys in **all
6 locale files** for _both_ the feature label _and_ the
`roleSettings.permissions.<module>.<action>` label — in the same change. The
`roleSettings` namespace already exists in every locale file; extend it, don't
fork it. See `../../skills/backend/add-permission.md` for the full sequence.

---

### Quick gate

Before you commit text changes, confirm: (1) zero hardcoded user-facing
strings — every label/placeholder/toast/dialog is `t()`; (2) every new key
exists in **all 6** `src/i18n/*.json` with a real translation (no placeholders);
(3) any backend `messageKey` you reference has a mirrored `errors.*` entry in all
6 files; (4) layout uses `start`/`end`, no physical `left`/`right`/`pl-`/`mr-`;
(5) no `dangerouslySetInnerHTML`. Then run `pnpm lint` and `pnpm typecheck` and
don't claim green until both pass (`../global/validation-gates.md`).
