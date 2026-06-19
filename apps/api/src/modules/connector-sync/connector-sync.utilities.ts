import { AlertSeverity, AlertStatus } from '../../common/enums'
import { nowMs, toDay, toIso } from '../../common/utils/date-time.utility'
import type { Prisma } from '@prisma/client'

export function mapGraylogPriorityToSeverity(priority: number): AlertSeverity {
  if (priority >= 4) return AlertSeverity.CRITICAL
  if (priority >= 3) return AlertSeverity.HIGH
  if (priority >= 2) return AlertSeverity.MEDIUM
  if (priority >= 1) return AlertSeverity.LOW
  return AlertSeverity.INFO
}

export function buildGraylogAlertData(
  tenantId: string,
  rawEvent: Record<string, unknown>
): {
  externalId: string
  createData: Prisma.AlertUncheckedCreateInput
  updateData: Prisma.AlertUncheckedUpdateInput
} {
  const wrapper = rawEvent
  const event = (wrapper.event ?? wrapper) as Record<string, unknown>

  const externalId = (event.id ?? `graylog-${nowMs()}-${Math.random()}`) as string
  const message = (event.message ?? event.key ?? 'Graylog Event') as string
  const priority = (event.priority ?? 2) as number
  const timestamp = toDay((event.timestamp ?? toIso()) as string).toDate()
  const source = (event.source ?? '') as string

  const createData: Prisma.AlertUncheckedCreateInput = {
    tenantId,
    externalId,
    title: message,
    description: JSON.stringify(event),
    severity: mapGraylogPriorityToSeverity(priority),
    status: AlertStatus.NEW_ALERT,
    source: 'graylog',
    ruleName: (event.event_definition_id ?? null) as string | null,
    ruleId: (event.event_definition_id ?? null) as string | null,
    agentName: source || null,
    sourceIp: (event.source_ip ?? null) as string | null,
    destinationIp: null,
    mitreTactics: [],
    mitreTechniques: [],
    rawEvent: event as Prisma.InputJsonValue,
    timestamp,
  }

  const updateData: Prisma.AlertUncheckedUpdateInput = {
    rawEvent: event as Prisma.InputJsonValue,
  }

  return { externalId, createData, updateData }
}

export function countFulfilledResults<T>(results: Array<PromiseSettledResult<T>>): {
  fulfilled: T[]
  failedCount: number
} {
  const fulfilled: T[] = []
  let failedCount = 0

  for (const result of results) {
    if (result.status === 'fulfilled') {
      fulfilled.push(result.value)
    } else {
      failedCount += 1
    }
  }

  return { fulfilled, failedCount }
}
