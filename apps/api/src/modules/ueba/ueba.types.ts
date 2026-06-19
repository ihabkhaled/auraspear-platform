import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type { UebaEntity, UebaAnomaly, MlModel } from '@prisma/client'

export type EntityWithAnomalyCount = UebaEntity & { _count: { anomalies: number } }
export type AnomalyWithEntity = UebaAnomaly & {
  entity: { entityName: string; entityType: string }
}

export type UebaEntityRecord = UebaEntity & {
  anomalyCount: number
}

export type PaginatedEntities = PaginatedResponse<UebaEntityRecord>

export type UebaAnomalyRecord = UebaAnomaly & {
  entityName: string
  entityType: string
}

export type PaginatedAnomalies = PaginatedResponse<UebaAnomalyRecord>

export type MlModelRecord = MlModel

export type PaginatedModels = PaginatedResponse<MlModelRecord>

export interface UebaStats {
  totalEntities: number
  criticalRiskEntities: number
  highRiskEntities: number
  anomalies24h: number
  activeModels: number
}
