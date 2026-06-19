import { ENTITY_SORT_FIELDS, ENTITY_TYPE_WEIGHTS } from './entities.constants'
import { diffMs, nowDate } from '../../common/utils/date-time.utility'
import { buildOrderBy } from '../../common/utils/query.utility'
import type { ListEntitiesQueryDto } from './dto/list-entities-query.dto'
import type {
  AlertExtractionInput,
  EntityGraphEdge,
  EntityGraphNode,
  EntityGraphResponse,
  EntityRecord,
  EntityRelationRecord,
  ExtractedEntity,
  RiskBreakdownFactor,
} from './entities.types'
import type { Prisma } from '@prisma/client'

export function buildEntitySearchWhere(
  tenantId: string,
  query: ListEntitiesQueryDto
): Prisma.EntityWhereInput {
  const where: Prisma.EntityWhereInput = { tenantId }

  if (query.type) {
    where.type = query.type
  }

  if (query.minRiskScore !== undefined) {
    where.riskScore = { gte: query.minRiskScore }
  }

  if (query.search) {
    where.OR = [
      { value: { contains: query.search, mode: 'insensitive' } },
      { displayName: { contains: query.search, mode: 'insensitive' } },
    ]
  }

  return where
}

export function buildEntityOrderBy(
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): Prisma.EntityOrderByWithRelationInput {
  return buildOrderBy(
    ENTITY_SORT_FIELDS,
    'lastSeen',
    sortBy,
    sortOrder
  ) as Prisma.EntityOrderByWithRelationInput
}

/* ---------------------------------------------------------------- */
/* GRAPH BUILDING                                                    */
/* ---------------------------------------------------------------- */

export function collectConnectedIds(
  relations: EntityRelationRecord[],
  rootEntityId: string
): Set<string> {
  const connectedIds = new Set<string>()
  for (const relation of relations) {
    connectedIds.add(relation.fromEntityId)
    connectedIds.add(relation.toEntityId)
  }
  connectedIds.delete(rootEntityId)
  return connectedIds
}

export function collectSecondHopData(secondHopResults: EntityRelationRecord[][]): {
  secondHopRelations: EntityRelationRecord[]
  secondHopIds: Set<string>
} {
  const secondHopRelations: EntityRelationRecord[] = []
  const secondHopIds = new Set<string>()
  for (const relations of secondHopResults) {
    for (const relation of relations) {
      secondHopRelations.push(relation)
      secondHopIds.add(relation.fromEntityId)
      secondHopIds.add(relation.toEntityId)
    }
  }
  return { secondHopRelations, secondHopIds }
}

export function deduplicateRelations(
  allRelations: EntityRelationRecord[]
): Map<string, EntityRelationRecord> {
  const uniqueRelations = new Map<string, EntityRelationRecord>()
  for (const relation of allRelations) {
    uniqueRelations.set(relation.id, relation)
  }
  return uniqueRelations
}

export function mapEntitiesToGraphNodes(entities: EntityRecord[]): EntityGraphNode[] {
  return entities.map(e => ({
    id: e.id,
    type: e.type,
    value: e.value,
    displayName: e.displayName,
    riskScore: e.riskScore,
  }))
}

export function mapRelationsToGraphEdges(
  uniqueRelations: Map<string, EntityRelationRecord>
): EntityGraphEdge[] {
  return [...uniqueRelations.values()].map(r => ({
    id: r.id,
    fromEntityId: r.fromEntityId,
    toEntityId: r.toEntityId,
    relationType: r.relationType,
    confidence: r.confidence,
    source: r.source,
  }))
}

export function buildGraphResponse(
  rootEntity: EntityRecord,
  entities: EntityRecord[],
  uniqueRelations: Map<string, EntityRelationRecord>
): EntityGraphResponse {
  return {
    rootEntity,
    nodes: mapEntitiesToGraphNodes(entities),
    edges: mapRelationsToGraphEdges(uniqueRelations),
  }
}

/* ---------------------------------------------------------------- */
/* RISK SCORING                                                      */
/* ---------------------------------------------------------------- */

export function getEntityTypeWeight(entityType: string): number {
  return ENTITY_TYPE_WEIGHTS.get(entityType) ?? 5
}

export function computeRecencyScore(lastSeen: Date): number {
  const daysSinceLastSeen = Math.max(0, diffMs(lastSeen, nowDate()) / (1000 * 60 * 60 * 24))
  if (daysSinceLastSeen < 1) return 15
  if (daysSinceLastSeen < 7) return 10
  if (daysSinceLastSeen < 30) return 5
  return 0
}

export function computeDaysSinceLastSeen(lastSeen: Date): number {
  return Math.max(0, diffMs(lastSeen, nowDate()) / (1000 * 60 * 60 * 24))
}

export function buildRiskBreakdownFactors(
  relationCount: number,
  entityType: string,
  lastSeen: Date,
  baseExistenceScore: number,
  relationWeight: number
): RiskBreakdownFactor[] {
  const factors: RiskBreakdownFactor[] = []

  factors.push({
    factor: 'base_existence',
    score: baseExistenceScore,
    description: 'Base score for entity existence in the graph',
  })

  const relationScore = Math.min(relationCount * relationWeight, 30)
  if (relationScore > 0) {
    factors.push({
      factor: 'relation_count',
      score: relationScore,
      description: `Entity has ${String(relationCount)} relationships`,
    })
  }

  const typeWeight = getEntityTypeWeight(entityType)
  factors.push({
    factor: 'entity_type',
    score: typeWeight,
    description: `Entity type "${entityType}" inherent risk weight`,
  })

  const recencyScore = computeRecencyScore(lastSeen)
  if (recencyScore > 0) {
    const daysSinceLastSeen = computeDaysSinceLastSeen(lastSeen)
    factors.push({
      factor: 'recency',
      score: recencyScore,
      description: `Last seen ${Math.round(daysSinceLastSeen)} days ago`,
    })
  }

  return factors
}

export function sumFactorScores(factors: RiskBreakdownFactor[], maxScore: number): number {
  let total = 0
  for (const factor of factors) {
    total += factor.score
  }
  return Math.min(total, maxScore)
}

/* ---------------------------------------------------------------- */
/* ENTITY EXTRACTION                                                 */
/* ---------------------------------------------------------------- */

export function mapMispIocTypeToEntityType(iocType: string): string | null {
  switch (iocType) {
    case 'ip-src':
    case 'ip-dst':
      return 'ip'
    case 'domain':
      return 'domain'
    case 'hostname':
      return 'hostname'
    case 'email-src':
    case 'email-dst':
      return 'email'
    case 'md5':
    case 'sha1':
    case 'sha256':
      return 'hash'
    case 'url':
      return 'url'
    default:
      return null
  }
}

export function extractUserFromRawEvent(rawEvent: Record<string, unknown>): string | null {
  const data = rawEvent['data'] as Record<string, unknown> | undefined
  if (!data) return null

  const { srcuser } = data
  if (typeof srcuser === 'string' && srcuser.length > 0) return srcuser

  const { dstuser } = data
  if (typeof dstuser === 'string' && dstuser.length > 0) return dstuser

  const win = data['win'] as Record<string, unknown> | undefined
  const eventdata = win?.['eventdata'] as Record<string, unknown> | undefined
  const targetUserName = eventdata?.['TargetUserName']
  if (typeof targetUserName === 'string' && targetUserName.length > 0) return targetUserName

  const { user } = data
  if (typeof user === 'string' && user.length > 0) return user

  return null
}

export function extractDomainFromRawEvent(rawEvent: Record<string, unknown>): string | null {
  const data = rawEvent['data'] as Record<string, unknown> | undefined
  if (!data) return null

  const { hostname } = data
  if (typeof hostname === 'string' && hostname.includes('.')) return hostname

  const { query } = data
  if (typeof query === 'string' && query.includes('.')) return query

  const dns = data['dns'] as Record<string, unknown> | undefined
  const question = dns?.['question'] as Record<string, unknown> | undefined
  const name = question?.['name']
  if (typeof name === 'string' && name.includes('.')) return name

  return null
}

export function buildEntityListFromAlert(alert: AlertExtractionInput): ExtractedEntity[] {
  const entities: ExtractedEntity[] = []

  if (alert.sourceIp) {
    entities.push({ type: 'ip', value: alert.sourceIp })
  }

  if (alert.destinationIp) {
    entities.push({ type: 'ip', value: alert.destinationIp })
  }

  if (alert.agentName) {
    entities.push({ type: 'hostname', value: alert.agentName, displayName: alert.agentName })
  }

  const rawEvent = alert.rawEvent as Record<string, unknown> | null
  if (rawEvent) {
    const user = extractUserFromRawEvent(rawEvent)
    if (user) {
      entities.push({ type: 'user', value: user })
    }

    const domain = extractDomainFromRawEvent(rawEvent)
    if (domain) {
      entities.push({ type: 'domain', value: domain })
    }
  }

  return entities
}
