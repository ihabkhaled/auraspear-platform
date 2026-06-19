/**
 * @auraspear/ai — dependency-free AI building blocks shared by web and api.
 *
 * Pair this package with `docs/AI.md` (architecture + governance) and the
 * api's live AI subsystem (apps/api/src/modules/ai). It deliberately holds only
 * provider-agnostic contracts and pure utilities — no SDKs, no infrastructure.
 */
export * from './safety.ts'
export * from './redaction.ts'
export * from './model-router.ts'
export * from './types.ts'
export * from './evaluators.ts'
export * from './prompts.ts'
