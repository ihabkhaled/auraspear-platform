import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'

export interface NormalizationPipelineRecord {
  id: string
  tenantId: string
  name: string
  description: string | null
  sourceType: string
  status: string
  parserConfig: Record<string, unknown>
  fieldMappings: Record<string, unknown>
  processedCount: string
  errorCount: number
  lastProcessedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type PaginatedPipelines = PaginatedResponse<NormalizationPipelineRecord>

export interface NormalizationStats {
  totalPipelines: number
  activePipelines: number
  inactivePipelines: number
  errorPipelines: number
  totalEventsProcessed: string
  totalErrors: number
}

/* ---------------------------------------------------------------- */
/* Normalization Executor                                            */
/* ---------------------------------------------------------------- */

export interface NormalizationStep {
  type: 'rename' | 'map' | 'extract' | 'drop' | 'default'
  sourceField: string
  targetField?: string
  mapping?: Record<string, string>
  pattern?: string
  defaultValue?: unknown
}

export interface NormalizationResult {
  pipelineId: string
  status: 'success' | 'partial' | 'error'
  inputCount: number
  outputCount: number
  droppedCount: number
  durationMs: number
  errors: string[]
}

export interface NormalizationPipelineInput {
  id: string
  name: string
  steps: NormalizationStep[]
}

export interface NormalizationOutput {
  result: NormalizationResult
  normalizedEvents: Record<string, unknown>[]
}

export interface PipelineEntity {
  id: string
  tenantId: string
  name: string
  description: string | null
  sourceType: string
  status: string
  parserConfig: unknown
  fieldMappings: unknown
  processedCount: bigint | number
  errorCount: number
  lastProcessedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
