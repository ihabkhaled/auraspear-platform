import { Injectable, Logger } from '@nestjs/common'
import { AppLogFeature } from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import {
  nowMs,
  nowDate,
  elapsedMs,
  toIso,
  toDay,
  subtractDuration,
} from '../../common/utils/date-time.utility'
import type { CorrelationEvent, CorrelationResult, CorrelationRuleInput } from './correlation.types'

@Injectable()
export class CorrelationExecutor {
  private readonly logger = new Logger(CorrelationExecutor.name)
  private readonly log: ServiceLogger

  constructor(private readonly appLogger: AppLoggerService) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.CORRELATION, 'CorrelationExecutor')
  }

  /**
   * Evaluates a correlation rule against a window of events.
   * Foundation for threshold-based and sequence-based correlation.
   */
  async evaluateRule(
    rule: CorrelationRuleInput,
    events: CorrelationEvent[]
  ): Promise<CorrelationResult> {
    const startTime = nowMs()

    this.log.entry('evaluateRule', '', {
      ruleId: rule.id,
      eventCount: events.length,
      threshold: rule.threshold,
      timeWindowMinutes: rule.timeWindowMinutes,
    })

    try {
      const windowEnd = nowDate()
      const windowStart = subtractDuration(windowEnd, rule.timeWindowMinutes, 'minute')

      // Filter events by type and time window
      const relevantEvents = events.filter(event => {
        const eventTime = toDay(event.timestamp).toDate()
        return (
          rule.eventTypes.includes(event.type) && eventTime >= windowStart && eventTime <= windowEnd
        )
      })

      this.log.debug('evaluateRule', '', 'filtered events', {
        ruleId: rule.id,
        totalEvents: events.length,
        relevantEvents: relevantEvents.length,
      })

      // Group by field if specified
      if (rule.groupBy) {
        const result = this.evaluateWithGroupBy(rule, relevantEvents, startTime)
        this.log.success('evaluateRule', '', {
          ruleId: rule.id,
          eventCount: events.length,
          status: result.status,
          eventsCorrelated: result.eventsCorrelated,
          durationMs: result.durationMs,
        })
        return result
      }

      if (relevantEvents.length >= rule.threshold) {
        const durationMs = elapsedMs(startTime)
        const result: CorrelationResult = {
          ruleId: rule.id,
          status: 'triggered',
          eventsCorrelated: relevantEvents.length,
          triggeredAt: toIso(),
          description: `${String(relevantEvents.length)} matching events within ${String(rule.timeWindowMinutes)}min (threshold: ${String(rule.threshold)})`,
          durationMs,
        }
        this.log.success('evaluateRule', '', {
          ruleId: rule.id,
          eventCount: events.length,
          status: result.status,
          eventsCorrelated: result.eventsCorrelated,
          durationMs: result.durationMs,
        })
        return result
      }

      const result: CorrelationResult = {
        ruleId: rule.id,
        status: 'not_triggered',
        eventsCorrelated: relevantEvents.length,
        durationMs: elapsedMs(startTime),
      }
      this.log.success('evaluateRule', '', {
        ruleId: rule.id,
        eventCount: events.length,
        status: result.status,
        eventsCorrelated: result.eventsCorrelated,
        durationMs: result.durationMs,
      })
      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Correlation rule ${rule.id} evaluation failed: ${errorMessage}`)

      this.log.error('evaluateRule', '', error, {
        ruleId: rule.id,
        eventCount: events.length,
        durationMs: elapsedMs(startTime),
      })

      return {
        ruleId: rule.id,
        status: 'error',
        eventsCorrelated: 0,
        durationMs: elapsedMs(startTime),
        error: errorMessage,
      }
    }
  }

  private evaluateWithGroupBy(
    rule: CorrelationRuleInput,
    relevantEvents: CorrelationEvent[],
    startTime: number
  ): CorrelationResult {
    const groupByField = rule.groupBy
    if (!groupByField) {
      return {
        ruleId: rule.id,
        status: 'not_triggered',
        eventsCorrelated: 0,
        durationMs: elapsedMs(startTime),
      }
    }

    const groups = new Map<string, number>()
    for (const event of relevantEvents) {
      const groupValue = String(Reflect.get(event.data, groupByField) ?? 'unknown')
      groups.set(groupValue, (groups.get(groupValue) ?? 0) + 1)
    }

    this.log.debug('evaluateWithGroupBy', '', 'groups computed', {
      ruleId: rule.id,
      groupByField,
      groupCount: groups.size,
    })

    // Check if any group exceeds threshold
    for (const [groupValue, count] of groups) {
      if (count >= rule.threshold) {
        const durationMs = elapsedMs(startTime)
        this.logger.warn(
          `Correlation rule ${rule.id} triggered: ${String(count)} events for ${groupByField}=${groupValue}`
        )
        return {
          ruleId: rule.id,
          status: 'triggered',
          eventsCorrelated: count,
          triggeredAt: toIso(),
          description: `${String(count)} events for ${groupByField}=${groupValue} within ${String(rule.timeWindowMinutes)}min (threshold: ${String(rule.threshold)})`,
          durationMs,
        }
      }
    }

    return {
      ruleId: rule.id,
      status: 'not_triggered',
      eventsCorrelated: relevantEvents.length,
      durationMs: elapsedMs(startTime),
    }
  }
}
