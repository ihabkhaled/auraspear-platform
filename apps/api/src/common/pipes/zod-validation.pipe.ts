import { type ArgumentMetadata, Injectable, type PipeTransform } from '@nestjs/common'
import { ZodSchema, ZodError } from 'zod'
import { issueToMessageKey } from './zod-validation.utilities'
import { BusinessException } from '../exceptions/business.exception'

/**
 * Generic validation pipe that validates incoming data against a Zod schema.
 *
 * IMPORTANT: Never use @UsePipes() at method level when @Param() is present.
 * Instead apply the pipe directly on @Body():
 *
 * @example
 *   @Post(':id')
 *   create(@Param('id') id: string, @Body(new ZodValidationPipe(Schema)) dto: Dto) { ... }
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    try {
      return this.schema.parse(value)
    } catch (error) {
      if (error instanceof ZodError) {
        const messageKeys = error.errors.map(issueToMessageKey)
        const firstKey = messageKeys[0] ?? 'errors.validation.failed'

        throw new BusinessException(
          400,
          `Validation failed: ${messageKeys.join(', ')}`,
          firstKey,
          messageKeys
        )
      }
      throw new BusinessException(400, 'Validation failed', 'errors.validation.failed')
    }
  }
}
