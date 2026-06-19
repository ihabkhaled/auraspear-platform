import { ENTITY_SORT_FIELDS, ANOMALY_SORT_FIELDS, MODEL_SORT_FIELDS } from './ueba.constants'
import { buildOrderBy } from '../../common/utils/query.utility'
import type { Prisma } from '@prisma/client'

/* ---------------------------------------------------------------- */
/* ENTITY QUERY BUILDING                                             */
/* ---------------------------------------------------------------- */

export function buildEntityListWhere(
  tenantId: string,
  entityType?: string,
  riskLevel?: string,
  query?: string
): Prisma.UebaEntityWhereInput {
  const where: Prisma.UebaEntityWhereInput = { tenantId }

  if (entityType) {
    where.entityType = entityType as Prisma.UebaEntityWhereInput['entityType']
  }

  if (riskLevel) {
    where.riskLevel = riskLevel as Prisma.UebaEntityWhereInput['riskLevel']
  }

  if (query && query.trim().length > 0) {
    where.OR = [
      { entityName: { contains: query, mode: 'insensitive' } },
      { topAnomaly: { contains: query, mode: 'insensitive' } },
    ]
  }

  return where
}

export function buildEntityOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.UebaEntityOrderByWithRelationInput {
  return buildOrderBy(ENTITY_SORT_FIELDS, 'riskScore', sortBy, sortOrder)
}

/* ---------------------------------------------------------------- */
/* ANOMALY QUERY BUILDING                                            */
/* ---------------------------------------------------------------- */

export function buildAnomalyListWhere(
  tenantId: string,
  severity?: string,
  entityId?: string,
  resolved?: boolean
): Prisma.UebaAnomalyWhereInput {
  const where: Prisma.UebaAnomalyWhereInput = { tenantId }

  if (severity) {
    where.severity = severity as Prisma.UebaAnomalyWhereInput['severity']
  }

  if (entityId) {
    where.entityId = entityId
  }

  if (resolved !== undefined) {
    where.resolved = resolved
  }

  return where
}

export function buildAnomalyOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.UebaAnomalyOrderByWithRelationInput {
  return buildOrderBy(ANOMALY_SORT_FIELDS, 'detectedAt', sortBy, sortOrder)
}

/* ---------------------------------------------------------------- */
/* ML MODEL QUERY BUILDING                                           */
/* ---------------------------------------------------------------- */

export function buildModelListWhere(
  tenantId: string,
  status?: string,
  modelType?: string
): Prisma.MlModelWhereInput {
  const where: Prisma.MlModelWhereInput = { tenantId }

  if (status) {
    where.status = status as Prisma.MlModelWhereInput['status']
  }

  if (modelType) {
    where.modelType = modelType as Prisma.MlModelWhereInput['modelType']
  }

  return where
}

/* ---------------------------------------------------------------- */
/* RECORD MAPPING                                                    */
/* ---------------------------------------------------------------- */

export function mapEntityWithCount(entity: {
  _count: { anomalies: number }
  [key: string]: unknown
}): Record<string, unknown> & { anomalyCount: number } {
  const { _count, ...rest } = entity
  return {
    ...rest,
    anomalyCount: _count.anomalies,
  }
}

export function mapAnomalyWithEntity(anomaly: {
  entity: { entityName: string; entityType: string }
  [key: string]: unknown
}): Record<string, unknown> & { entityName: string; entityType: string } {
  const { entity, ...rest } = anomaly
  return {
    ...rest,
    entityName: entity.entityName,
    entityType: entity.entityType,
  }
}

/* ---------------------------------------------------------------- */
/* ML MODEL QUERY BUILDING                                           */
/* ---------------------------------------------------------------- */

export function buildModelOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.MlModelOrderByWithRelationInput {
  return buildOrderBy(MODEL_SORT_FIELDS, 'updatedAt', sortBy, sortOrder)
}
