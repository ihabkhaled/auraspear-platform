export interface ConnectorSyncStatusRow {
  type: string
  lastSyncAt: Date | null
  syncEnabled: boolean
  enabled: boolean
}

export interface ConnectorSyncStatusItem {
  type: string
  lastSyncAt: string | null
  syncEnabled: boolean
  enabled: boolean
}
