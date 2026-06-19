import { ConnectorType } from '../../common/enums'

/** Sync runs every 2 minutes (120 000 ms). */
export const SYNC_INTERVAL_MS = 120_000

/** Minimum gap between syncs for the same connector (90 seconds). */
export const MIN_SYNC_GAP_MS = 90_000

/** Connectors whose data we can ingest automatically. */
export const SYNCABLE_TYPES: ConnectorType[] = [
  ConnectorType.WAZUH,
  ConnectorType.GRAYLOG,
  ConnectorType.MISP,
]

export const SYNCABLE_TYPES_SET = new Set<string>(SYNCABLE_TYPES)
