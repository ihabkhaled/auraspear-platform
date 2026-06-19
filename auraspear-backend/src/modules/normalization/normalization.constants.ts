export const VALID_STEP_TYPES = new Set(['rename', 'map', 'extract', 'drop', 'default'])

export const PIPELINE_SORT_FIELDS: Record<string, string> = {
  name: 'name',
  sourceType: 'sourceType',
  status: 'status',
  processedCount: 'processedCount',
  errorCount: 'errorCount',
  updatedAt: 'updatedAt',
  createdAt: 'createdAt',
}
