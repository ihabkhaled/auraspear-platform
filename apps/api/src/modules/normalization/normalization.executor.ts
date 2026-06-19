import { Injectable, Logger } from '@nestjs/common'
import { AppLogFeature } from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { nowMs, elapsedMs } from '../../common/utils/date-time.utility'
import type {
  NormalizationOutput,
  NormalizationPipelineInput,
  NormalizationStep,
} from './normalization.types'

@Injectable()
export class NormalizationExecutor {
  private readonly logger = new Logger(NormalizationExecutor.name)
  private readonly log: ServiceLogger

  constructor(private readonly appLogger: AppLoggerService) {
    this.log = new ServiceLogger(
      this.appLogger,
      AppLogFeature.NORMALIZATION,
      'NormalizationExecutor'
    )
  }

  /**
   * Applies a normalization pipeline to a batch of events.
   */
  async executePipeline(
    pipeline: NormalizationPipelineInput,
    events: Record<string, unknown>[]
  ): Promise<NormalizationOutput> {
    const startTime = nowMs()
    const normalizedEvents: Record<string, unknown>[] = []
    const errors: string[] = []
    let droppedCount = 0

    this.log.entry('executePipeline', '', {
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      eventCount: events.length,
      stepCount: pipeline.steps.length,
    })

    for (const event of events) {
      try {
        this.log.debug('executePipeline', '', 'processing event', { pipelineId: pipeline.id })

        const normalized = this.applySteps(event, pipeline.steps)
        if (normalized === null) {
          droppedCount++
        } else {
          normalizedEvents.push(normalized)
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        errors.push(message)
      }
    }

    const durationMs = elapsedMs(startTime)
    this.logger.log(
      `Pipeline ${pipeline.id} processed ${String(events.length)} events: ${String(normalizedEvents.length)} normalized, ${String(droppedCount)} dropped in ${String(durationMs)}ms`
    )

    this.log.success('executePipeline', '', {
      pipelineId: pipeline.id,
      inputCount: events.length,
      outputCount: normalizedEvents.length,
      droppedCount,
      errorCount: errors.length,
      durationMs,
    })

    return {
      result: {
        pipelineId: pipeline.id,
        status: errors.length > 0 ? 'partial' : 'success',
        inputCount: events.length,
        outputCount: normalizedEvents.length,
        droppedCount,
        durationMs,
        errors,
      },
      normalizedEvents,
    }
  }

  private applySteps(
    event: Record<string, unknown>,
    steps: NormalizationStep[]
  ): Record<string, unknown> | null {
    let result = { ...event }

    for (const step of steps) {
      const applied = this.applyStep(result, step)
      if (applied === null) {
        return null
      }
      result = applied
    }

    return result
  }

  private applyStep(
    result: Record<string, unknown>,
    step: NormalizationStep
  ): Record<string, unknown> | null {
    switch (step.type) {
      case 'rename':
        return this.applyRename(result, step)
      case 'map':
        return this.applyMap(result, step)
      case 'extract':
        return this.applyExtract(result, step)
      case 'drop':
        return this.applyDrop(result, step)
      case 'default':
        return this.applyDefault(result, step)
      default:
        return result
    }
  }

  private applyRename(
    result: Record<string, unknown>,
    step: NormalizationStep
  ): Record<string, unknown> {
    const sourceValue = Reflect.get(result, step.sourceField)

    if (step.targetField && sourceValue !== undefined) {
      Reflect.set(result, step.targetField, sourceValue)
      return Object.fromEntries(
        Object.entries(result).filter(([key]) => key !== step.sourceField)
      ) as Record<string, unknown>
    }

    return result
  }

  private applyMap(
    result: Record<string, unknown>,
    step: NormalizationStep
  ): Record<string, unknown> {
    const sourceValue = Reflect.get(result, step.sourceField)

    if (step.mapping && typeof sourceValue === 'string' && step.targetField) {
      const mappedValue = Reflect.get(step.mapping, sourceValue)
      if (mappedValue !== undefined) {
        Reflect.set(result, step.targetField, mappedValue)
      }
    }

    return result
  }

  private applyExtract(
    result: Record<string, unknown>,
    step: NormalizationStep
  ): Record<string, unknown> {
    const sourceValue = Reflect.get(result, step.sourceField)

    if (step.pattern && typeof sourceValue === 'string' && step.targetField) {
      if (step.pattern.length > 1000) {
        throw new Error('Regex pattern exceeds maximum allowed length of 1000 characters')
      }

      const regex = this.buildRegex(step.pattern)
      if (!regex) {
        throw new Error(`Invalid regex pattern: ${step.pattern}`)
      }

      const match = regex.exec(sourceValue)
      if (match?.[1]) {
        Reflect.set(result, step.targetField, match[1])
      }
    }

    return result
  }

  private applyDrop(
    result: Record<string, unknown>,
    step: NormalizationStep
  ): Record<string, unknown> | null {
    if (Reflect.get(result, step.sourceField) !== undefined) {
      return null // Drop the entire event
    }

    return result
  }

  private applyDefault(
    result: Record<string, unknown>,
    step: NormalizationStep
  ): Record<string, unknown> {
    if (Reflect.get(result, step.sourceField) === undefined) {
      const targetKey = step.targetField ?? step.sourceField
      Reflect.set(result, targetKey, step.defaultValue)
    }

    return result
  }

  /**
   * Builds a RegExp from a validated pattern string.
   * Returns null if the pattern is invalid.
   */
  private buildRegex(pattern: string): RegExp | null {
    try {
      // Pattern has been length-validated before this call
      return RegExp(pattern)
    } catch {
      return null
    }
  }
}
