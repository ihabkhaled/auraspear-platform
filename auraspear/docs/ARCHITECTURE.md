# AuraSpear SOC -- Frontend Architecture

This document describes the architecture of the AuraSpear SOC frontend application. For development rules and coding standards, see [CLAUDE.md](../CLAUDE.md).

---

## Tech Stack

| Category        | Technology                          | Version |
| --------------- | ----------------------------------- | ------- |
| Framework       | Next.js (App Router, webpack dev)   | 16.1.6  |
| Language        | TypeScript (strict mode, all flags) | 5       |
| UI Library      | React + React DOM                   | 19.2.3  |
| Styling         | Tailwind CSS v4 (CSS-first config)  | 4       |
| Components      | shadcn/ui (Radix primitives)        | 3.8.5   |
| Server State    | @tanstack/react-query               | 5.90    |
| Global State    | Zustand                             | 5.0     |
| Forms           | React Hook Form + Zod               | 7.71    |
| HTTP Client     | Axios (auth/tenant interceptors)    | 1.13    |
| i18n            | next-intl (EN, ES, IT, FR, AR, DE)  | 4.8     |
| Theming         | next-themes (light/dark/system)     | 0.4     |
| Charts          | Recharts                            | 3.7     |
| Icons           | lucide-react                        | 0.575   |
| PWA             | @serwist/next                       | 9.5     |
| Toast / Dialogs | Sonner + SweetAlert2                | --      |
| Linting         | ESLint 9 (7 plugins, flat config)   | 9       |
| Formatting      | Prettier + tailwindcss plugin       | 3.8     |
| Git Hooks       | Husky v9 + lint-staged + commitlint | --      |

---

## High-Level Architecture

```
+-----------------------------------------------------+
|                     Browser                          |
+-----------------------------------------------------+
           |                          |
           v                          v
+-------------------+      +-------------------+
|   React 19 SPA    |      |  Service Worker   |
|   (App Router)    |      |  (@serwist/next)  |
+-------------------+      +-------------------+
           |
           v
+-------------------+
|  Axios Instance   |   Authorization + X-Tenant-Id headers
|  (src/lib/api.ts) |   attached via interceptors
+-------------------+
           |
           v
+-------------------+
| Next.js API Routes|   156 proxy routes in src/app/api/
| (Server-Side)     |   proxyToBackend() utility
+-------------------+
           |
           v
+-------------------+
|  NestJS Backend   |   http://localhost:4000/api/v1
+-------------------+
           |
           v
+-----------------------------------------------+
| Wazuh | Graylog | Velociraptor | MISP | etc.  |
+-----------------------------------------------+
```

The frontend never calls external services directly. All requests pass through Next.js API routes that proxy to the NestJS backend. The backend communicates with Wazuh, Graylog, Velociraptor, Grafana, InfluxDB, MISP, Shuffle, and AWS Bedrock.

---

## Project Structure

```
src/
+-- app/
|   +-- (auth)/                    Auth routes (login, callback) -- no sidebar
|   +-- (portal)/                  Main app -- AuthGuard + Sidebar
|   |   +-- dashboard/             Executive dashboard
|   |   +-- alerts/                Alert management
|   |   +-- cases/                 Case list + [id] detail + cycles
|   |   +-- hunt/                  Threat hunting
|   |   +-- intel/                 Threat intelligence (IOC, MISP)
|   |   +-- incidents/             Incident management
|   |   +-- connectors/            Connector list + [type] config
|   |   +-- explorer/              Data explorer (8 sub-pages)
|   |   +-- detection-rules/       Detection rules
|   |   +-- correlation/           Correlation rules
|   |   +-- normalization/         Normalization pipelines
|   |   +-- entities/              Entity management + OSINT enrichment
|   |   +-- ai-config/             AI agent configuration
|   |   +-- ai-agents/             AI agent management
|   |   +-- admin/system/          System admin (multi-tenant)
|   |   +-- admin/tenant/          Tenant user management
|   |   +-- admin/role-settings/   Role permission matrix editor
|   |   +-- profile/               User profile
|   |   +-- settings/              Preferences
|   +-- api/                       Server-side API proxy (156 routes)
|   +-- globals.css                Tailwind v4 theme + status/severity classes
|   +-- layout.tsx                 Root layout (i18n, fonts, Toaster, SW)
|   +-- providers.tsx              QueryClient, ThemeProvider, NextIntlClientProvider
|   +-- sw.ts                      Service worker (PWA)
+-- components/
|   +-- ui/                        shadcn/ui primitives (28+ components)
|   +-- common/                    DataTable, PageHeader, Toast, SweetAlert, etc.
|   +-- layout/                    PortalShell, Sidebar, Topbar, TenantSwitcher
|   +-- ai-config/                 AI config components (OsintSourceCard, etc.)
|   +-- <domain>/                  Domain components (alerts, cases, hunt, intel, etc.)
+-- hooks/                         230+ custom hooks (one file per hook)
+-- services/                      28 singleton API services
+-- stores/                        7 Zustand stores
+-- types/                         34 type definition files
+-- enums/                         38 enum files
+-- i18n/                          6 locale files (en, ar, es, fr, de, it)
+-- lib/
|   +-- api.ts                     Axios instance with auth/tenant interceptors
|   +-- backend-proxy.ts           proxyToBackend() for API routes
|   +-- constants/                 25 constant files
|   +-- validation/                15 Zod validation schemas
|   +-- *.utils.ts                 Domain utility functions
+-- mocks/                         MSW mock handlers + data
```

---

## Key Architecture Patterns

### 1. Hooks-First, TSX Render-Only

TSX component files contain only JSX rendering. All logic -- state, effects, data fetching, event handlers, translations -- lives in custom hooks in `src/hooks/`.

```
Page (.tsx)
  |
  +-- useModulePage()          Page-level orchestrator hook
        |
        +-- useModuleData()    TanStack Query data fetching
        +-- useModuleFilters() Filter/search state
        +-- useModuleDialogs() Dialog open/close state
        +-- useModuleCrud()    Create/update/delete mutations
```

Every page gets a page-level hook that composes smaller hooks and returns everything the TSX file needs. The TSX file never imports `useState`, `useEffect`, `useTranslations`, or any other hook directly.

### 2. Enum-Driven Architecture

All string literal types are enums defined in `src/enums/`. This eliminates magic strings throughout the codebase. There are 38 enum files covering alerts, cases, connectors, permissions, AI agents, OSINT sources, IOC types, and more.

Key enum categories:

- **Domain enums**: `AlertSeverity`, `CaseStatus`, `ConnectorType`, `IncidentStatus`
- **Permission enums**: `Permission` (mirrors backend exactly, ~70 values)
- **AI enums**: `AiAgentId`, `AiFeatureKey`, `AiTriggerMode`, `AiOutputFormat`, `AiConnectorPreference`
- **OSINT enums**: `OsintSourceType`, `OsintAuthType`, `IOCType`
- **UI enums**: `StatusTextClass`, `StatusBgClass`, `StatusBorderClass`

### 3. Service Layer

28 singleton service objects in `src/services/` wrap Axios calls. Each service covers one domain (alerts, cases, connectors, etc.). Services are imported directly -- no dependency injection.

```
Component -> Hook -> Service -> Axios -> API Route -> Backend
```

### 4. Separation of Concerns

Strict file placement rules enforced by ESLint `no-restricted-syntax`:

| Artifact          | Location                                |
| ----------------- | --------------------------------------- |
| Enums             | `src/enums/<domain>.enum.ts`            |
| Types/Interfaces  | `src/types/<domain>.types.ts`           |
| Constants         | `src/lib/constants/<domain>.ts`         |
| Hooks             | `src/hooks/use<Name>.ts`                |
| Utility functions | `src/lib/<domain>.utils.ts`             |
| Zod schemas       | `src/lib/validation/<domain>.schema.ts` |
| Components        | `src/components/<domain>/<Name>.tsx`    |

---

## State Management

### Four State Layers

| Layer        | Tool            | Purpose                                  |
| ------------ | --------------- | ---------------------------------------- |
| Server State | TanStack Query  | API data fetching, caching, invalidation |
| Global State | Zustand         | Auth, tenant, filters, UI (7 stores)     |
| Form State   | React Hook Form | Form management with Zod validation      |
| URL State    | Next.js Router  | Route params, search params              |

### Zustand Stores (`src/stores/`)

| Store        | File                    | Key              | Purpose                             |
| ------------ | ----------------------- | ---------------- | ----------------------------------- |
| Auth Store   | `auth.store.ts`         | `auth-storage`   | JWT tokens, user info, permissions  |
| Tenant Store | `tenant.store.ts`       | `tenant-storage` | Switched tenant ID for GLOBAL_ADMIN |
| Filter Store | `filter.store.ts`       | --               | Shared filter state across pages    |
| Hunt Store   | `hunt.store.ts`         | --               | Threat hunting session state        |
| UI Store     | `ui.store.ts`           | --               | Sidebar collapse, modal state       |
| Notification | `notification.store.ts` | --               | WebSocket notification state        |

### TanStack Query Conventions

- Query keys always include `tenantId` for tenant-aware caching
- `placeholderData: keepPreviousData` on all list queries
- `staleTime: 60_000` for slowly changing data (connectors, AI configs)
- Mutations invalidate related query keys including `tenantId`
- `isFetching` (not `isLoading`) passed to DataTable loading prop

---

## Internationalization (i18n)

- **System**: next-intl v4.8
- **Locales**: English, Arabic (RTL), Spanish, French, German, Italian
- **Files**: `src/i18n/{en,ar,es,fr,de,it}.json`
- **Client components**: `const t = useTranslations('namespace')`
- **Server components**: `const t = await getTranslations('namespace')`
- **RTL**: Full bidirectional layout support for Arabic using logical properties (`ps-`, `pe-`, `ms-`, `me-`, `text-start`, `text-end`)
- **Rule**: Every user-facing string must go through `t()`. No hardcoded text.

---

## Authentication and Authorization

### Auth Flow

1. User logs in via email/password or OIDC (Entra ID)
2. Backend returns JWT access + refresh tokens
3. Tokens stored in Zustand auth store (localStorage `auth-storage`)
4. Axios interceptor attaches `Authorization: Bearer <token>` to every request
5. Axios interceptor attaches `X-Tenant-Id` header for GLOBAL_ADMIN tenant switching
6. Next.js middleware protects portal routes -- redirects to `/login` if no token

### RBAC

- 6 roles: `GLOBAL_ADMIN` > `TENANT_ADMIN` > `SOC_ANALYST_L2` > `THREAT_HUNTER` > `SOC_ANALYST_L1` > `EXECUTIVE_READONLY`
- ~70 granular permissions stored in database, editable per tenant via `/admin/role-settings`
- Permissions auto-sync every 60s via `/auth/me` polling
- Frontend enforcement: `usePermissions()`, `useHasPermission()`, `<RoleGuard>` component
- Backend enforcement: `@Roles()` guard + `@RequirePermission()` decorator

### Permission-Aware UI

All pages conditionally show/hide UI elements based on resolved permissions. Hooks expose `canCreate`, `canEdit`, `canDelete` booleans. TSX files gate with `{canCreate && <Button />}`.

---

## AI Integration

The platform integrates AI across 10+ surfaces. See [AI-SURFACES.md](./AI-SURFACES.md) for the complete guide.

### Connector Priority

AI requests are routed through the first available connector in priority order:

1. **AWS Bedrock** (`bedrock`) -- Direct cloud AI (Claude models)
2. **LLM APIs** (`llm_apis`) -- OpenAI-compatible endpoints
3. **OpenClaw Gateway** (`openclaw_gateway`) -- AI gateway layer

The shared `useAvailableAiConnectors` hook manages connector selection across all AI surfaces.

### AI Feature Catalog

Every AI capability is registered in the `AiFeatureKey` enum (23 features). Features can be enabled/disabled per tenant via the AI Config admin page.

---

## OSINT Enrichment

The platform supports OSINT enrichment across alerts, entities, and intel pages. See [OSINT-ENRICHMENT.md](./OSINT-ENRICHMENT.md) for the complete guide.

---

## Styling System

### Tailwind CSS v4 (CSS-First)

No `tailwind.config.js`. Theme defined via `@theme inline` in `src/app/globals.css` using CSS custom properties. Colors switch automatically between light and dark modes via the `.dark` class.

### Semantic Color Classes

Status and severity colors use predefined utility classes -- never raw Tailwind color classes:

- **Text**: `text-status-warning`, `text-status-error`, `text-status-success`, `text-status-info`
- **Severity**: `text-severity-critical`, `text-severity-high`, `text-severity-medium`, `text-severity-low`
- **Background**: `bg-status-warning`, `bg-severity-critical`, etc.
- **Border**: `border-status-warning`, `border-severity-critical`, etc.

### Theme-Aware Tokens

| Token                   | Light          | Dark           |
| ----------------------- | -------------- | -------------- |
| `bg-background`         | White base     | Dark base      |
| `bg-card`               | Card surface   | Card surface   |
| `bg-muted`              | Muted section  | Muted section  |
| `text-foreground`       | Primary text   | Primary text   |
| `text-muted-foreground` | Secondary text | Secondary text |
| `border-border`         | Border color   | Border color   |

---

## Testing

- **Framework**: Vitest + React Testing Library
- **Patterns**: Component render tests, hook tests, interaction tests, i18n checks
- **MSW**: Mock Service Worker for API mocking in tests and development
- **Run**: `npm test` (Vitest), `npm run validate` (typecheck + lint + format check)

---

## Build and Development

```bash
npm run dev              # Start dev server (webpack)
npm run build            # Production build
npm run validate         # typecheck + lint:strict + format:check
npm run validate:fix     # Auto-fix lint + format issues
npm test                 # Run tests
```

### Pre-Commit Hooks

Every commit runs through Husky + lint-staged:

1. ESLint on staged files
2. TypeScript type check (`tsc --noEmit`)
3. Prettier formatting

Conventional Commits enforced by commitlint: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
