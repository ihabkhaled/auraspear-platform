/**
 * ES internal endpoints that must never appear in user query text.
 * Covers: admin APIs, bulk write, reindex, delete-by-query, etc.
 */
export const DANGEROUS_ENDPOINTS =
  /_search|_mapping|_cluster|_cat|_nodes|_mget|_bulk|_msearch|_delete_by_query|_update_by_query|_reindex|_aliases|_template|_settings|_tasks|_ingest|_snapshot|_recovery|_flush|_forcemerge|_cache|_segments|_shard_stores|_field_caps/gi

/**
 * Script injection patterns — Elasticsearch scripting can execute
 * arbitrary code on the cluster.
 */
export const SCRIPT_PATTERN = /\bscript\b/gi

/**
 * Aggregation keywords that could trigger server-side computation.
 */
export const AGGREGATION_PATTERN = /\baggregations?\b|\baggs?\b/gi

/**
 * Wildcard-all pattern — `*:*` matches everything and can be used
 * for data exfiltration.  Also catches backslash-escaped variants.
 */
export const MATCH_ALL_PATTERN = /\\?\*\s*:\s*\\?\*/g

/** Maximum allowed length for any user-supplied ES query string. */
export const MAX_QUERY_LENGTH = 1000
