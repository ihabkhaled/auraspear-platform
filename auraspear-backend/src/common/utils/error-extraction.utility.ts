/**
 * Shared error extraction utilities.
 *
 * Consolidates the identical `extractErrorMessage` / `extractErrorStack`
 * helpers that were duplicated across health, token-blacklist, and others.
 */

export function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

export function extractErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined
}
