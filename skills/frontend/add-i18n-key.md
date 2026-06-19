# Skill — Add an i18n key (`apps/web/src/i18n`, 6 locales)

> **Read `AGENTS.md` (repo root) FIRST.** The one rule: _no AI agent may edit
> first and understand later._ Follow the loading order in `AGENTS.md` §1, then
> load these in order before you touch a file:
>
> 1. `AGENTS.md` (repo root) — invariants, command map, validation gates
> 2. `apps/web/CLAUDE.md` — frontend rules (esp. rule 9 + the "i18n" /
>    "Translation Rules" section) and the full ESLint/TS config
> 3. `apps/api/CLAUDE.md` — rules 17–18 (`BusinessException` + `messageKey`) and
>    rule 49 (every `messageKey` exists in **all 6** locale files)
> 4. `rules/frontend/i18n-rules.md` — the hard i18n constraints (locale set,
>    `errors.*` parity, RTL). Where it and `CLAUDE.md` overlap, the **CLAUDE.md
>    rule number wins** — it is authoritative and ESLint-enforced.
> 5. `context/` (the area whose copy you're adding), `docs/` (deep reference)
> 6. Sibling recipes: `skills/frontend/add-page.md`,
>    `skills/frontend/add-component.md`, `skills/frontend/add-hook.md`,
>    `skills/backend/add-permission.md` (the permission flow that fans out to i18n)
> 7. `memory/` for stable truths the repo expects you to already know

This recipe adds one or more translation keys to the next-intl message catalogs
under `apps/web/src/i18n/`. Every user-facing string in the web app must come
from `t()` (`apps/web/CLAUDE.md` rule 9) — there is no other sanctioned way to
show copy. A key is real only when it exists, with a genuine translation, in
**all six** locale files. A key in `en.json` but missing from `de.json` throws
at runtime for German users — it is a bug, not a lint warning.

---

## When to use

Use this recipe whenever you need to introduce user-facing text:

- a new label, placeholder, tooltip, button caption, table header, empty-state
  message, toast, `SweetAlertDialog` text, validation hint, or confirmation
  dialog for a feature/page/component, **or**
- a new **backend error** `messageKey` (a `BusinessException` thrown in
  `apps/api`, e.g. `errors.cases.notFound`) that the frontend must resolve to
  localized copy — its mirror lives under the `errors.*` namespace here, **or**
- a new permission's labels (the feature label _and_ the
  `roleSettings.permissions.<module>.<action>` label) — but that is one step of
  a larger flow: follow `skills/backend/add-permission.md`
  (`apps/web/CLAUDE.md` rule 34 step 9 / `apps/api/CLAUDE.md` rule 85 step 8),
  not this recipe alone.

**Do NOT** use this recipe to "translate later", to drop a `TODO`/placeholder
into the non-English files, or to copy the English string verbatim into
`ar.json`/`de.json`/etc. ("Translation Rules" #5). Provide a real translation in
each language or do not add the key.

---

## Files to inspect first

Read these before writing anything — they define the exact locale set, the key
shapes, and the resolution path:

- **`apps/web/src/lib/constants/locales.ts`** — the source of truth for the
  locale set and order: `SUPPORTED_LOCALES = ['en', 'es', 'it', 'fr', 'ar', 'de']`.
  Same six the task names (en, ar, es, fr, de, it). `DEFAULT_LOCALE = 'en'`.
- **`apps/web/src/i18n/index.ts`** — `getRequestConfig` reads the `locale`
  cookie, validates it against `SUPPORTED_LOCALES`, and dynamically imports
  `./${locale}.json`. Unknown locale → falls back to `en`. Each locale file is
  loaded whole; a missing key is not silently filled from `en`.
- **The six catalogs** — `apps/web/src/i18n/en.json`, `ar.json`, `es.json`,
  `fr.json`, `de.json`, `it.json`. All six carry the **same top-level
  namespaces** (currently `app`, `nav`, `common`, `dashboard`, `alerts`, …,
  `errors`, `roleSettings`, …). Open `en.json` and find the namespace you're
  extending so you mirror its existing shape; keys are **insertion-ordered**
  (not alphabetized) — append within the right sub-object.
- **`apps/web/src/lib/api-error.ts`** — `getErrorKey(error)` extracts a backend
  `messageKey`, strips the leading `errors.` prefix, and returns a key for
  `useTranslations('errors')`. `getFieldErrors()` / `getFirstFieldError()` do the
  same for field-level validation keys. This is why backend `messageKey`s mirror
  under the `errors` namespace, with the `errors.` prefix removed inside the file.
- **`apps/web/src/enums/error-message-key.enum.ts`** (barrel: `@/enums`) — the
  enum of known error keys (`ErrorMessageKey.COMMON_UNKNOWN`, …). If you add a
  reusable/common error key, add the enum member here too.
- **`apps/web/src/lib/toast.utils.ts`** — `buildErrorToastHandler(tErrors)`, the
  mutation `onError` factory (`apps/web/CLAUDE.md` rule 62). Confirm how error
  keys reach the UI before you name one.
- **The backend side, if mirroring an error** — the `BusinessException` you're
  matching (e.g. in `apps/api/src/modules/<module>/<module>.service.ts` or
  `.utilities.ts`). The `messageKey` string there must be exactly
  `errors.<module>.<specificAction>` (`apps/api/CLAUDE.md` rules 17–18) and the
  frontend key must match it verbatim.
- **A real namespace to copy the shape of** — e.g. `errors.auth` /
  `errors.alerts` (`{ "notFound": "Alert not found.", "alreadyClosed": "…" }`)
  for errors, or `alerts` (`title`, `description`, `searchPlaceholder`,
  `noAlerts`, …) for feature copy.

---

## Exact step-by-step implementation

Worked example below: adding a feature toast key `incidents.archived` **and** a
mirrored backend error key `errors.incidents.alreadyArchived`. Adapt the
namespace/key names to your case. **All paths are absolute from repo root.**

### 1. Decide the namespace and key path (match the existing tree)

- **Namespace by module** ("Translation Rules" #4): feature copy goes under the
  module namespace (`incidents.*`, `cases.*`, `hunt.*`, `correlation.tabs.*`,
  `incidents.kpi.open`). Do not invent a parallel flat key — extend the existing
  sub-object.
- **Backend error keys go under `errors.<module>.<specificAction>`** and must
  match the `BusinessException` `messageKey` string exactly (minus the rendering
  prefix; see step 3). Example: backend throws
  `new BusinessException(HttpStatus.CONFLICT, 'Already archived', 'errors.incidents.alreadyArchived')`
  → frontend key is `errors.incidents.alreadyArchived`.
- **Permission labels go under** `roleSettings.permissions.<module>.<action>`
  (and a feature label in the module namespace) — but use
  `skills/backend/add-permission.md` for the whole sequence; don't fork
  `roleSettings`, extend it.
- Use ICU placeholders for dynamic values (`"deleted": "{count} deleted"`) — never
  build a sentence by concatenating translated fragments; word order differs per
  locale (`rules/frontend/i18n-rules.md` §6).

### 2. Add the key to `en.json` first (the canonical shape)

Open `apps/web/src/i18n/en.json`, find the namespace sub-object, and append the
key. Keep it inside the correct object; preserve insertion order (append at the
end of the sub-object, valid JSON, trailing-comma-free):

```jsonc
// apps/web/src/i18n/en.json  → "incidents": { … add inside this object … }
"incidents": {
  "title": "Incidents",
  // …existing keys…
  "archived": "Incident archived"
}
```

```jsonc
// apps/web/src/i18n/en.json  → "errors": { … "incidents": { … } … }
"errors": {
  // …
  "incidents": {
    "notFound": "Incident not found.",
    "alreadyArchived": "This incident is already archived."
  }
}
```

### 3. Mirror the key into ALL FIVE other locales — with real translations

Add the **same key path** to every one of the remaining files with a correct,
human translation (not the English string, not a `TODO`):

| File                        | `incidents.archived`   | `errors.incidents.alreadyArchived`       |
| --------------------------- | ---------------------- | ---------------------------------------- |
| `apps/web/src/i18n/en.json` | `Incident archived`    | `This incident is already archived.`     |
| `apps/web/src/i18n/ar.json` | `تمت أرشفة الحادث`     | `تمت أرشفة هذا الحادث بالفعل.`           |
| `apps/web/src/i18n/es.json` | `Incidente archivado`  | `Este incidente ya está archivado.`      |
| `apps/web/src/i18n/fr.json` | `Incident archivé`     | `Cet incident est déjà archivé.`         |
| `apps/web/src/i18n/de.json` | `Vorfall archiviert`   | `Dieser Vorfall ist bereits archiviert.` |
| `apps/web/src/i18n/it.json` | `Incidente archiviato` | `Questo incidente è già archiviato.`     |

Notes that matter:

- **Same key path in every file.** The object nesting and the leaf key name must
  be byte-identical across all six; only the string value changes.
- **The `errors.` prefix is part of the key path _inside the file_** — the
  backend sends `errors.incidents.alreadyArchived`, but `getErrorKey()` strips
  `errors.` and the UI calls it via `useTranslations('errors')` as
  `incidents.alreadyArchived`. So in the JSON it lives at
  `errors → incidents → alreadyArchived`, and the consumer resolves
  `tErrors('incidents.alreadyArchived')`.
- **Arabic (`ar`) is RTL** — the value is just translated text; direction is
  handled once in `src/app/layout.tsx` (`dir = locale === 'ar' ? 'rtl' : 'ltr'`),
  not in the string. Keep ICU placeholders (`{count}`) untranslated and in place.
- **If you added a backend error key**, also confirm the matching
  `BusinessException` exists in `apps/api` with the identical `messageKey`
  (`apps/api/CLAUDE.md` rules 17–18, 49) — the two are one vocabulary and must
  not drift.

### 4. (Errors only) register the enum member if it's reusable

If the new error key is broadly reused (like `COMMON_UNKNOWN`), add a member to
`apps/web/src/enums/error-message-key.enum.ts` and keep the barrel
(`apps/web/src/enums/index.ts`) exporting it. Module-specific one-off error keys
that are only ever produced by the backend and resolved via `getErrorKey()` do
not each need an enum member — but never type a key as a raw string union
(`apps/web/CLAUDE.md` rule 17); if you enumerate keys, use an enum.

### 5. Consume the key via `t()` — never inline the string

Per `rules/frontend/i18n-rules.md` §2 and `component-rules.md`, **hook calls do
not live in `.tsx`**. Call `useTranslations` inside the page-level hook in
`apps/web/src/hooks/` and pass resolved strings (or `t` itself) to the component:

```ts
// apps/web/src/hooks/useIncidentsPage.ts (client hook)
import { useTranslations } from 'next-intl'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { Toast } from '@/components/common'

const t = useTranslations('incidents') // feature namespace
const tErrors = useTranslations('errors') // backend-error namespace

// success copy:
Toast.success(t('archived')) // → "Incident archived"

// mutation error (resolves errors.incidents.alreadyArchived via getErrorKey):
onError: buildErrorToastHandler(tErrors) // CLAUDE.md rule 62 — do NOT hand-write
// Toast.error(tErrors(getErrorKey(error)))
```

For **server components**, use `const t = await getTranslations('incidents')`
from `next-intl/server`. Never import a translation library anywhere else, and
never read the locale outside `src/i18n/index.ts`.

---

## Validation commands (run from repo root — pnpm only, Node 22)

Run these and read the output. **Never claim a gate is green without running
it** (`AGENTS.md` §5, §13).

```bash
# 0. Confirm all six files are still valid JSON (a stray comma/brace breaks the
#    whole locale at runtime). One node check per file:
node -e "for (const l of ['en','ar','es','fr','de','it']) { require('./apps/web/src/i18n/'+l+'.json'); console.log(l,'OK'); }"

# 1. Confirm the new key exists in ALL SIX locales (replace the path with yours;
#    dotted lookup so it works for nested keys like errors.incidents.alreadyArchived):
node -e "for (const l of ['en','ar','es','fr','de','it']) { const j=require('./apps/web/src/i18n/'+l+'.json'); const v='errors.incidents.alreadyArchived'.split('.').reduce((o,k)=>o&&o[k], j); console.log(l, v===undefined?'MISSING':'OK'); }"

# 2. Blocking gate — full TS type check across the monorepo
pnpm typecheck

# 3. Lint the web app (rule 9 hardcoded-string ban, import/enum rules)
pnpm lint
# or zero-tolerance:
pnpm lint:strict

# 4. Formatting (Prettier; also normalizes JSON)
pnpm format:check     # check only
pnpm format           # auto-fix

# 5. Combined gate the repo uses
pnpm validate         # turbo typecheck + lint:strict + format:check

# 6. See it render in the running app (manual): switch the `locale` cookie to
#    each language and confirm the copy appears (no raw key, no missing-message error)
pnpm dev:web
```

`pnpm typecheck` and `pnpm build` are the hard gates (`AGENTS.md` §5). The JSON
existence/parity checks in steps 0–1 catch the most common i18n bug — a key
present in `en.json` and missing elsewhere — which neither `typecheck` nor `lint`
detects (the JSON is loaded dynamically). Run them for every locale.

---

## Docs to update

Only touch docs when the change is real and load-bearing:

- **The six `apps/web/src/i18n/*.json`** — the keys themselves (this _is_ the
  change). All six or none.
- **`apps/api`** — if you added/mirrored a backend error key, the
  `BusinessException` with the matching `messageKey` must exist in the relevant
  service/utility (`apps/api/CLAUDE.md` rules 17–18). The two sides are one
  vocabulary.
- **`apps/web/src/enums/error-message-key.enum.ts`** — only if you added a
  reusable error key that code references by enum.
- **`apps/web/CLAUDE.md`** — generally no change for a single key; the i18n rules
  already cover it. Update only if you introduce a new top-level namespace
  (rare) or change a documented pattern.
- Don't invent new doc files. If a pattern changes, note it where that pattern is
  documented (`docs/DOCS_INDEX.md` is the index).

---

## Security checks

These are platform invariants (`AGENTS.md` §6–§7); a violation is a blocker:

- **Show only `t(messageKey)` to users — never the raw backend error string or
  internal details** (`apps/web/CLAUDE.md` Security rule 40; backend also
  sanitizes via `apps/api/CLAUDE.md` rule 77). The whole point of `errors.*`
  keys is that the client renders localized copy, not server internals. Do not
  add a key whose value leaks a path, stack frame, table/column name, or
  hostname.
- **Never render a translated (or AI-produced) string via
  `dangerouslySetInnerHTML`** — `react/no-danger` is `error`-level (`AGENTS.md`
  §7; `apps/web/CLAUDE.md` rules 36 & 43). Translations are plain text or safe
  markdown; HTML in a translation value is a forbidden injection surface. Never
  put markup in a locale string expecting it to be rendered as HTML.
- **No secrets, tokens, tenant IDs, or PII baked into translation values.**
  Catalogs are static, shipped to every client, and tenant-agnostic. Dynamic
  per-tenant/per-user data is passed as an ICU placeholder at render time, never
  hardcoded into the string.
- **Tenant isolation / RBAC are not weakened by copy.** A label is not an
  authorization check — never add a key that implies a client-side permission
  bypass, and never gate UI on the _presence_ of a string instead of the real
  permission hook/guard.
- **AI copy carries the right framing** — if the key labels an AI surface, it
  must support the required AI-safety affordances (provider attribution,
  confidence, the `approval-required` category for destructive actions); see
  `skills/frontend/add-ai-panel.md`. Never label a destructive AI action as
  auto-allowed.

## Common mistakes

- **Adding the key to `en.json` only.** Missing it in any of `ar/es/fr/de/it`
  throws a missing-message error at runtime for that locale ("Translation Rules"
  #5; `rules/frontend/i18n-rules.md` §3). All six, every time.
- **Placeholder/`TODO`/English-copied translations** in the non-English files.
  Provide a real translation per language.
- **Mismatched key paths across files** — a typo or different nesting in one
  locale means that locale silently lacks the key. The step-1 parity check
  (`node -e …`) catches this.
- **Wrong namespace for an error.** Backend errors mirror under `errors.*` with
  the path `errors.<module>.<action>`, resolved via `getErrorKey()` +
  `useTranslations('errors')`. Putting them in the feature namespace means
  `getErrorKey()` returns a key that doesn't resolve.
- **Key drift from the backend `messageKey`.** The frontend key must equal the
  backend `messageKey` exactly (`apps/api/CLAUDE.md` rules 17–18, 49). Adding the
  i18n entry but forgetting (or misspelling) the `BusinessException` key — or
  vice versa — breaks error display.
- **Hardcoding the string in the component instead of using `t()`** (rule 9) —
  an ESLint violation that blocks review.
- **Calling `useTranslations` inside a `.tsx`** — hooks live in `src/hooks/`
  (`component-rules.md`; `apps/web/CLAUDE.md` rules 14, 16). Resolve in the hook,
  pass the string down.
- **Hand-writing `Toast.error(tErrors(getErrorKey(error)))`** instead of
  `buildErrorToastHandler(tErrors)` (rule 62).
- **Concatenating translated fragments** to build a sentence — breaks word order
  in other locales. Use one key with ICU placeholders.
- **Invalid JSON** — a trailing comma or unbalanced brace breaks the _entire_
  locale (the file is imported whole). Run the step-0 parse check on all six.
- **HTML/markup inside a translation value** intended to be rendered as HTML —
  forbidden (`react/no-danger`). Plain text or safe markdown only.
- **String-literal union of keys** instead of an enum (rule 17) — if you
  enumerate error keys in TS, use `ErrorMessageKey` in `@/enums`.

## Final checklist

Before you say done (mirrors `rules/frontend/i18n-rules.md` "Quick gate"):

- [ ] Read `AGENTS.md`, `apps/web/CLAUDE.md` (rule 9 + i18n section),
      `apps/api/CLAUDE.md` (rules 17–18, 49), `rules/frontend/i18n-rules.md`.
- [ ] Key lives under the correct namespace (`<module>.*` for feature copy;
      `errors.<module>.<action>` for backend errors;
      `roleSettings.permissions.<module>.<action>` for permission labels via the
      permission recipe).
- [ ] The **same key path** exists in **all six** files —
      `apps/web/src/i18n/{en,ar,es,fr,de,it}.json` — each with a real, correct
      translation (no `TODO`, no English placeholder, no missing locale).
- [ ] Backend errors: the frontend key matches the `BusinessException`
      `messageKey` exactly; resolved via `getErrorKey()` +
      `useTranslations('errors')`; reusable keys also in `ErrorMessageKey`.
- [ ] Consumed via `t()` (in a `src/hooks/` hook or a server component) — no
      hardcoded string, no `useTranslations` in a `.tsx`, no hand-written
      error-toast (use `buildErrorToastHandler`).
- [ ] No raw HTML in any value; no `dangerouslySetInnerHTML`; no secrets/PII/
      internal details in copy; user only ever sees `t(messageKey)`.
- [ ] Dynamic values use ICU placeholders, not fragment concatenation; RTL is
      automatic (no direction baked into the Arabic string).
- [ ] All six files are valid JSON (step-0 check) and the parity check (step-1)
      reports `OK` for every locale.
- [ ] Ran `pnpm typecheck` (blocking) and `pnpm lint` / `pnpm format:check` —
      and they actually passed. **Do not claim green without the output.**
