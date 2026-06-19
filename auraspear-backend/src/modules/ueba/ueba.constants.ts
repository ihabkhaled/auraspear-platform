export const ENTITY_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  riskScore: 'riskScore',
  entityName: 'entityName',
  lastSeenAt: 'lastSeenAt',
  riskLevel: 'riskLevel',
  entityType: 'entityType',
}

export const ANOMALY_SORT_FIELDS: Record<string, string> = {
  detectedAt: 'detectedAt',
  score: 'score',
  severity: 'severity',
}

export const MODEL_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  accuracy: 'accuracy',
  name: 'name',
  lastTrained: 'lastTrained',
}
