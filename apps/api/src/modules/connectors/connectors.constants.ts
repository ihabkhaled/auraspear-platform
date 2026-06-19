/**
 * Config keys that hold URL values, used for URL field extraction and validation.
 */
export const URL_KEYS = new Set([
  'baseUrl',
  'managerUrl',
  'indexerUrl',
  'webhookUrl',
  'apiUrl',
  'grafanaUrl',
  'mispUrl',
])

/**
 * Canonical hostname for Google's Gemini (generative language) API.
 * Used to detect Gemini endpoints by parsed URL hostname rather than by
 * substring matching, which is bypassable (e.g. `https://evil.com/?x=gemini`).
 */
export const GEMINI_API_HOSTNAME = 'generativelanguage.googleapis.com'

/**
 * Maximum length for extracted remote error messages.
 * Prevents oversized third-party responses from bloating logs or API responses.
 */
export const MAX_REMOTE_ERROR_LENGTH = 300

/**
 * Minimum allowed timeout in milliseconds.
 * Prevents accidental sub-second timeouts from breaking connections.
 */
export const MINIMUM_TIMEOUT_MS = 5000
