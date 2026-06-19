export const ACCOUNT_SORT_FIELDS: Record<string, string> = {
  provider: 'provider',
  status: 'status',
  accountId: 'accountId',
  alias: 'alias',
  findingsCount: 'findingsCount',
  complianceScore: 'complianceScore',
  lastScanAt: 'lastScanAt',
  updatedAt: 'updatedAt',
  createdAt: 'createdAt',
}

export const FINDING_SORT_FIELDS: Record<string, string> = {
  severity: 'severity',
  status: 'status',
  title: 'title',
  createdAt: 'createdAt',
  detectedAt: 'detectedAt',
}
