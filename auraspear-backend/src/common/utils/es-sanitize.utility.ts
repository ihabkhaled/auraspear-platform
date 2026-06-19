/**
 * Elasticsearch / OpenSearch query sanitization utilities.
 *
 * Strips dangerous patterns from user-supplied query strings before
 * they are embedded in ES query DSL.  Every module that builds ES
 * queries MUST call `sanitizeEsQueryString()` on user input.
 */

import {
  DANGEROUS_ENDPOINTS,
  SCRIPT_PATTERN,
  AGGREGATION_PATTERN,
  MATCH_ALL_PATTERN,
  MAX_QUERY_LENGTH,
} from './es-sanitize.constants'

/**
 * Sanitize a user-supplied string before embedding it in an
 * Elasticsearch `query_string` or `simple_query_string` query.
 *
 * 1. Truncates to 1000 characters
 * 2. Strips dangerous ES endpoint names
 * 3. Strips `script` keyword (prevents Painless injection)
 * 4. Strips aggregation keywords
 * 5. Strips `*:*` match-all (including backslash-escaped variants)
 * 6. Trims whitespace
 *
 * Returns the sanitized string (may be empty — caller must check).
 */
export function sanitizeEsQueryString(query: string): string {
  return query
    .slice(0, MAX_QUERY_LENGTH)
    .replaceAll(SCRIPT_PATTERN, '')
    .replaceAll(DANGEROUS_ENDPOINTS, '')
    .replaceAll(MATCH_ALL_PATTERN, '')
    .replaceAll(AGGREGATION_PATTERN, '')
    .trim()
}

/**
 * Build a safe `query_string` clause for Elasticsearch.
 *
 * Always sets `allow_leading_wildcard: false` to prevent `*foo`
 * patterns that can cause catastrophic regex evaluation on the
 * ES cluster.
 */
export function buildSafeQueryStringClause(
  sanitizedQuery: string,
  defaultOperator: 'AND' | 'OR' = 'AND'
): Record<string, unknown> {
  return {
    query_string: {
      query: sanitizedQuery,
      default_operator: defaultOperator,
      allow_leading_wildcard: false,
      lenient: true,
    },
  }
}
