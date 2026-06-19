import { Injectable, Logger } from '@nestjs/common'
import { DetectionExecutionEngine } from './detection-rules.constants'
import {
  buildDetectionMatchDescription,
  compileDetectionConditions,
  evaluateDetectionProgram,
} from './detection-rules.utilities'
import { AppLogFeature } from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { nowMs, elapsedMs, toIso } from '../../common/utils/date-time.utility'
import type {
  DetectionExecutionResult,
  DetectionRuleMatch,
  EvaluatableDetectionRule,
} from './detection-rules.types'

@Injectable()
export class DetectionRulesExecutor {
  private readonly logger = new Logger(DetectionRulesExecutor.name)
  private readonly log: ServiceLogger

  constructor(private readonly appLogger: AppLoggerService) {
    this.log = new ServiceLogger(
      this.appLogger,
      AppLogFeature.DETECTION_RULES,
      'DetectionRulesExecutor'
    )
  }

  async evaluateRule(
    rule: EvaluatableDetectionRule,
    events: Record<string, unknown>[]
  ): Promise<DetectionExecutionResult> {
    const startTime = nowMs()

    this.log.entry('evaluateRule', '', {
      ruleId: rule.id,
      ruleName: rule.name,
      eventCount: events.length,
    })

    try {
      const matches: DetectionRuleMatch[] = []
      const detectionProgram = compileDetectionConditions(rule.conditions)

      for (const event of events) {
        this.log.debug('evaluateRule', '', 'processing event', { ruleId: rule.id })

        if (evaluateDetectionProgram(detectionProgram, event)) {
          matches.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            matchedEvent: event,
            matchedAt: toIso(),
            description: buildDetectionMatchDescription(rule.name, detectionProgram.engine),
          })
        }
      }

      const durationMs = elapsedMs(startTime)
      this.logger.log(
        `Rule ${rule.id} evaluated against ${String(events.length)} events: ${String(matches.length)} matches in ${String(durationMs)}ms`
      )

      this.log.success('evaluateRule', '', {
        ruleId: rule.id,
        eventCount: events.length,
        matchCount: matches.length,
        durationMs,
        engine: detectionProgram.engine,
      })

      return {
        ruleId: rule.id,
        status: matches.length > 0 ? 'matched' : 'no_match',
        matchCount: matches.length,
        matches,
        executedAt: toIso(),
        durationMs,
        engine: detectionProgram.engine,
      }
    } catch (error: unknown) {
      const durationMs = elapsedMs(startTime)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Rule ${rule.id} evaluation failed: ${errorMessage}`)

      this.log.error('evaluateRule', '', error, {
        ruleId: rule.id,
        eventCount: events.length,
        durationMs,
      })

      return {
        ruleId: rule.id,
        status: 'error',
        matchCount: 0,
        matches: [],
        executedAt: toIso(),
        durationMs,
        engine: DetectionExecutionEngine.UNKNOWN,
        error: errorMessage,
      }
    }
  }
}
