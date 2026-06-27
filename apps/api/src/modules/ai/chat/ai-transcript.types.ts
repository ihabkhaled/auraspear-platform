// Types for the AI transcript service. Extracted from the service to satisfy
// the no-inline-declarations rule (apps/api CLAUDE.md rule 13 / audit BE-05).

export interface TranscriptPolicyRecord {
  id: string
  tenantId: string
  chatRetentionDays: number
  auditRetentionDays: number
  autoRedactPii: boolean
  requireLegalHold: boolean
  lastCleanupAt: Date | null
  lastCleanupCount: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface TranscriptStats {
  totalThreads: number
  totalMessages: number
  totalAuditLogs: number
  threadsOnHold: number
  threadsRedacted: number
}
