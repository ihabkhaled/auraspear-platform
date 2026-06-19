import { HttpStatus } from '@nestjs/common'

export const STATUS_MESSAGE_KEYS = new Map<number, string>([
  [HttpStatus.BAD_REQUEST, 'errors.badRequest'],
  [HttpStatus.UNAUTHORIZED, 'errors.unauthorized'],
  [HttpStatus.FORBIDDEN, 'errors.forbidden'],
  [HttpStatus.NOT_FOUND, 'errors.notFound'],
  [HttpStatus.CONFLICT, 'errors.conflict'],
  [HttpStatus.UNPROCESSABLE_ENTITY, 'errors.validationFailed'],
  [HttpStatus.TOO_MANY_REQUESTS, 'errors.tooManyRequests'],
  [HttpStatus.INTERNAL_SERVER_ERROR, 'errors.internalError'],
  [HttpStatus.SERVICE_UNAVAILABLE, 'errors.serviceUnavailable'],
])
