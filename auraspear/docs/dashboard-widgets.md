# Adding Dashboard Widgets

## Goal

AuraSpear dashboard widgets must be powered by real backend data, role-aware, localized, and testable. Prefer extending the shared dashboard contracts before adding page-specific ad hoc fetches.

## Frontend flow

1. Add or extend a backend dashboard endpoint in the backend repo.
2. Mirror it through a BFF route in `src/app/api/dashboard/...`.
3. Add a typed service method in `src/services/dashboard.service.ts`.
4. Add a React Query hook in `src/hooks/useDashboard.ts`.
5. Convert the response into render props using a pure utility in `src/lib/`.
6. Render with existing shared components such as `DashboardSectionCard`, `DashboardNarrativeList`, `DashboardMetricBarList`, and chart components.

## Required rules

- No raw user-facing strings. Add keys to all 6 locale files.
- TSX files stay render-only. Put composition logic in hooks and utilities.
- Big sections must be collapsible and use `DashboardPanelKey` for persisted open/closed state.
- Prefer reusable dashboard contracts like `analytics-overview` and `operations-overview` over one-off route shapes.
- Add tests for both the service route wiring and the pure mapping utilities.

## Operational widgets

Use the `operations-overview` contract for:

- incident status breakdown
- case aging and assignment pressure
- rule performance and noisy detections
- connector sync health
- runtime backlog
- automation quality
- exposure summaries

If the widget needs different data, extend the backend contract instead of adding local mock math in the page hook.
