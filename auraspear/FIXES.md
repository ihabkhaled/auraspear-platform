# AuraSpear Platform — Fixes Applied

**Date**: 2026-03-15/16

---

## Backend Fixes (`auraspear-backend`)

### Critical — Endpoint Crashes (500 → Working)

1. **Correlation Service** — Fixed Prisma query field references and repository methods
   - Files: `correlation.controller.ts`, `correlation.service.ts`, `correlation.repository.ts`

2. **AI Agents Service** — Fixed service query, types, and utility mappings
   - Files: `ai-agents.controller.ts`, `ai-agents.service.ts`, `ai-agents.types.ts`, `ai-agents.utils.ts`

3. **Attack Paths pathNumber Generation** — `parseInt('2026-0030')` parsed as 2026 causing unique constraint collision
   - File: `attack-paths.repository.ts`
   - Fix: Properly extract sequence number from `AP-YYYY-NNNN` format

4. **Normalization Controller** — Fixed route registration and query parameter handling
   - File: `normalization.controller.ts`

5. **Detection Rules** — Extended module with rules-engine controller alias
   - Files: `detection-rules.controller.ts`, `detection-rules.module.ts`, `detection-rules.repository.ts`

6. **System Health Controller** — Fixed route configuration
   - File: `system-health.controller.ts`

### Missing Endpoints (404 → Added)

7. **Cases Stats** — Added `GET /cases/stats` endpoint with full aggregation
   - Files: `cases.controller.ts`, `cases.service.ts`, `cases.repository.ts`, `cases.types.ts`

8. **Reports Update** — Added `PATCH /reports/:id` endpoint
   - Files: `reports.controller.ts`, `reports.service.ts`, `reports.repository.ts`, `reports.utils.ts`
   - New: `dto/update-report.dto.ts`

9. **UEBA Entity CRUD** — Added POST, PATCH, DELETE for entities (only had GET)
   - Files: `ueba.controller.ts`, `ueba.service.ts`, `ueba.repository.ts`
   - New: `dto/create-entity.dto.ts`, `dto/update-entity.dto.ts`

10. **Cloud Security Stats** — Added top-level `GET /cloud-security/stats`
    - File: `cloud-security.controller.ts`

### Duplicate Handling (500 → 409)

11. **Compliance Service** — Check for duplicate (tenant_id, standard, version) before create
    - File: `compliance.service.ts`

12. **SOAR Service** — Check for duplicate (tenant_id, name) before create
    - File: `soar.service.ts`

13. **Normalization Service** — Check for duplicate (tenant_id, name) before create
    - File: `normalization.service.ts`

14. **UEBA Service** — Check for duplicate (tenant_id, entity_name, entity_type) before create
    - File: `ueba.service.ts`

### Other Backend Fixes

15. **compliance.service.ts** — `buildFrameworkRecord(framework)` missing second argument → added `undefined`
16. **hunts.service.ts** — Minor fix
17. **incidents.repository.ts** — Repository method fixes

---

## Frontend Fixes (`auraspear`)

### Enum Mismatches (11 fixed)

18. **AI Agent enums** — `ai-agent.enum.ts`: Tier (tier_1→L0/L1/L2/L3), Type (alert_triage→detection/response/hunting/analysis), Status (learning→active/paused/error/training)

19. **UEBA enums** — `ueba.enum.ts`: EntityType (ip→user/host/service_account/application), RiskLevel (added normal), MLModelType (regression→time_series/clustering/etc.)

20. **Attack Path enum** — `attack-path.enum.ts`: Status (monitoring→resolved)

21. **Cloud Security enum** — `cloud-security.enum.ts`: Removed extra `SUPPRESSED` value

22. **Normalization enum** — `normalization.enum.ts`: Fixed status values to match Prisma

23. **System Health enum** — `system-health.enum.ts`: ServiceType (wazuh/graylog→connector/database/api/queue/storage)

24. **Detection Rule enum** — `detection-rule.enum.ts`: Type (sigma→threshold/anomaly/chain/scheduled)

### Form Validation Fixes

25. **Vulnerability Create/Edit Dialog** — Added `{ valueAsNumber: true }` to `register('cvssScore')` and `register('affectedHosts')` — HTML inputs return strings, Zod expects numbers
    - Files: `VulnerabilityCreateDialog.tsx`, `VulnerabilityEditDialog.tsx`

26. **Attack Path Create/Edit Dialog** — Same fix for `register('affectedAssets')`
    - Files: `AttackPathCreateDialog.tsx`, `AttackPathEditDialog.tsx`

27. **Compliance Create/Edit Dialog** — Added missing `version` field to forms and validation schema
    - Files: `ComplianceFrameworkCreateDialog.tsx`, `ComplianceFrameworkEditDialog.tsx`, `compliance.schema.ts`

### Sorting/Search Added to Page Hooks

28. **useAiAgentsPage.ts** — Added sortBy/sortOrder state + handleSort
29. **useAttackPathsPage.ts** — Added sorting support
30. **useCorrelationPage.ts** — Added sorting support
31. **useUebaPage.ts** — Added sorting support
32. **useVulnerabilitiesPage.ts** — Added sorting support
33. **useSystemHealthPage.ts** — Added search support

### Type Updates

34. **ai-agent.types.ts** — Updated to match new enum values
35. **attack-path.types.ts** — Updated types
36. **compliance.types.ts** — Added version field
37. **system-health.types.ts** — Updated types
38. **ueba.types.ts** — Updated types

### Hook Updates

39. **useAiAgentCreateDialog.ts** — Updated for new enum values
40. **useAttackPathCreateDialog.ts** — Updated for schema changes
41. **useDetectionRuleCreateDialog.ts** — Updated for new enum values
42. **useSystemHealthCreateDialog.ts** — Updated for new enum values
43. **useVulnerabilityCreateDialog.ts** — Updated form handling

### i18n Updates

44. All 6 language files updated (en, es, it, fr, ar, de) for new/changed translation keys

---

## Summary

| Category | Count |
|----------|-------|
| Backend crash fixes (500→200) | 6 |
| Missing endpoints added | 4 |
| Duplicate handling (500→409) | 4 |
| Frontend enum mismatches fixed | 11 |
| Form validation fixes | 3 |
| Sorting/search added to hooks | 6 |
| Type/hook/i18n updates | 10+ |
| **Total fixes** | **44+** |

---

## Recent Fixes (2026-03-28)

### Backend

- Fixed UUID validation: non-UUID connectorId no longer stored in UUID column
- Fixed embedding model: uses text-embedding-004 (Gemini) / text-embedding-ada-002 (OpenAI) instead of falling back to chat model
- Fixed tsquery syntax errors: special characters stripped from search input
- Fixed chat maxTokens: increased from 2048 to 16384 to prevent response truncation
- Fixed memory retrieval: non-blocking with try/catch, graceful fallback to recent memories

### Frontend

- Fixed `AiFindingType` enum values to align with backend
- Migrated 250 files from direct UI imports to barrel imports
- Replaced 124 error toast patterns with `buildErrorToastHandler`
- Removed `useAvailableAiConnectors` prop drilling from 15 AI hooks + 11 components

### Mobile Responsiveness Fixes (2026-03-28)
- Chat panel: thread sidebar as slide-over overlay on mobile, static on desktop
- Chat header: compact connector select (w-28) on mobile, threads toggle button visible
- Chat messages: break-words prevents horizontal overflow
- NotificationBell: viewport-relative width and scroll height on mobile
- TenantSwitcher: narrower (w-24) on mobile
- AiConnectorSelect: full-width on mobile by default
- SearchInput: removed min-width constraint for mobile toolbars
- 18 dialogs: added max-w-[95vw] mobile fallback
- AI Findings/History: filter selects full-width on mobile with flex-wrap
- Case detail: viewport-relative max-heights for scroll containers
- Dashboard: two-column grids kick in at lg instead of xl
- DataTable: overflow-x-auto on loading skeleton
