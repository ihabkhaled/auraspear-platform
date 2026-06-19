import { HttpException } from '@nestjs/common'

/**
 * Base exception for business-logic errors that carry an i18n messageKey.
 * The GlobalExceptionFilter reads `messageKey` and includes it in the response
 * so the frontend can use `t(messageKey)` for localized error messages.
 *
 * Optional `errors` array carries field-level validation details.
 */
export class BusinessException extends HttpException {
  readonly messageKey: string

  constructor(status: number, message: string, messageKey: string, errors?: string[]) {
    super({ message, messageKey, statusCode: status, errors }, status)
    this.messageKey = messageKey
  }
}
