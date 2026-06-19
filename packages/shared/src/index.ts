/**
 * @auraspear/shared — single source of truth for cross-app contracts.
 *
 * STATUS: scaffolding. Today the web app (`apps/web/src/enums`,
 * `apps/web/src/types`) and the api app (`apps/api/src/common/enums`,
 * per-module `*.types.ts`) each own their own copies of permissions, roles,
 * enums, and DTO shapes. Consolidating them here is a deliberate follow-up
 * milestone (see docs/MONOREPO_MIGRATION.md) because it touches both apps'
 * strict ESLint "declarations must live in their home folder" rules and must
 * be validated end-to-end.
 *
 * Until then this package only carries a small, genuinely shared constant so
 * the workspace wiring is exercised. Do NOT add app-specific logic here.
 */

export const AURASPEAR_PRODUCT_NAME = 'AuraSpear' as const

export const SUPPORTED_LOCALES = ['en', 'ar', 'es', 'fr', 'de', 'it'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
