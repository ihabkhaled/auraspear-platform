import { HttpException, HttpStatus } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { STATUS_MESSAGE_KEYS } from './http-exception.constants'
import { toIso } from '../utils/date-time.utility'
import type { ErrorResponse, ParsedExceptionResult } from './http-exception.types'
import type { ZodInvalidTypeIssue, ZodIssue, ZodTooBigIssue, ZodTooSmallIssue } from 'zod'

export function statusToMessageKey(status: number): string {
  return STATUS_MESSAGE_KEYS.get(status) ?? 'errors.internalError'
}

/** Maps a ZodIssue to a field-specific i18n messageKey (same logic as ZodValidationPipe). */
export function zodIssueToMessageKey(issue: ZodIssue): string {
  const field = issue.path.join('.') || 'field'

  switch (issue.code) {
    case 'invalid_type': {
      const typed = issue as ZodInvalidTypeIssue
      if (typed.received === 'undefined') {
        return `errors.validation.${field}.required`
      }
      return `errors.validation.${field}.invalid`
    }
    case 'too_small': {
      const typed = issue as ZodTooSmallIssue
      if (typed.type === 'string' && typed.minimum === 1) {
        return `errors.validation.${field}.required`
      }
      if (typed.type === 'string') {
        return `errors.validation.${field}.tooShort`
      }
      if (typed.type === 'array') {
        return `errors.validation.${field}.tooFew`
      }
      return `errors.validation.${field}.invalid`
    }
    case 'too_big': {
      const typed = issue as ZodTooBigIssue
      if (typed.type === 'string') {
        return `errors.validation.${field}.tooLong`
      }
      if (typed.type === 'number') {
        return `errors.validation.${field}.tooLarge`
      }
      return `errors.validation.${field}.invalid`
    }
    case 'invalid_enum_value': {
      return `errors.validation.${field}.invalidOption`
    }
    default: {
      return `errors.validation.${field}.invalid`
    }
  }
}

/** Strip internal file paths from error messages to prevent information leakage. */
export function sanitizeMessage(value: string): string {
  return value.replaceAll(/[A-Z]:\\[^\s]+|\/[\w./-]+/g, '[path]').slice(0, 500)
}

function parseHttpException(exception: HttpException): ParsedExceptionResult {
  const status = exception.getStatus()
  const exceptionResponse = exception.getResponse()
  let { message } = exception
  let error = 'Error'
  let messageKey: string | undefined
  let errors: string[] | undefined

  if (typeof exceptionResponse === 'string') {
    message = exceptionResponse
  } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
    const responseObject = exceptionResponse as Record<string, unknown>
    const rawMessage = responseObject.message
    message = Array.isArray(rawMessage)
      ? rawMessage.join(', ')
      : ((rawMessage as string) ?? exception.message)
    error = (responseObject.error as string) ?? 'Error'
    messageKey = responseObject.messageKey as string | undefined
    errors = responseObject.errors as string[] | undefined
  }

  return {
    status,
    message,
    error,
    messageKey,
    errors,
    logAction: 'none',
    logMessage: undefined,
    logStack: undefined,
  }
}

function parseZodException(exception: ZodError): ParsedExceptionResult {
  const issueKeys = exception.errors.map(zodIssueToMessageKey)
  const messageKey = issueKeys[0] ?? 'errors.validation.failed'

  return {
    status: HttpStatus.BAD_REQUEST,
    message: `Validation failed: ${issueKeys.join(', ')}`,
    error: 'Bad Request',
    messageKey,
    errors: issueKeys,
    logAction: 'warn',
    logMessage: `ZodError caught by GlobalExceptionFilter: ${issueKeys.join(', ')}`,
    logStack: undefined,
  }
}

function parsePrismaKnownRequestError(
  exception: Prisma.PrismaClientKnownRequestError
): ParsedExceptionResult {
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'A database error occurred',
    error: 'Internal Server Error',
    messageKey: 'errors.internalError',
    errors: undefined,
    logAction: 'errorWithStack',
    logMessage: `Prisma error [${exception.code}]: ${exception.message}`,
    logStack: exception.stack,
  }
}

function parsePrismaValidationError(
  exception: Prisma.PrismaClientValidationError
): ParsedExceptionResult {
  return {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid database query',
    error: 'Bad Request',
    messageKey: 'errors.badRequest',
    errors: undefined,
    logAction: 'error',
    logMessage: `Prisma validation error: ${exception.message}`,
    logStack: undefined,
  }
}

function parsePrismaInitializationError(
  exception: Prisma.PrismaClientInitializationError
): ParsedExceptionResult {
  return {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: 'Service temporarily unavailable',
    error: 'Service Unavailable',
    messageKey: 'errors.serviceUnavailable',
    errors: undefined,
    logAction: 'error',
    logMessage: `Prisma initialization error: ${exception.message}`,
    logStack: undefined,
  }
}

function parseGenericError(exception: Error): ParsedExceptionResult {
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
    error: 'Internal Server Error',
    messageKey: undefined,
    errors: undefined,
    logAction: 'errorWithStack',
    logMessage: `Unhandled exception: ${exception.message}`,
    logStack: exception.stack,
  }
}

function parseUnknownError(): ParsedExceptionResult {
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
    error: 'Internal Server Error',
    messageKey: undefined,
    errors: undefined,
    logAction: 'unknownError',
    logMessage: 'Unknown exception occurred',
    logStack: undefined,
  }
}

export function parseException(exception: unknown): ParsedExceptionResult {
  if (exception instanceof HttpException) {
    return parseHttpException(exception)
  }
  if (exception instanceof ZodError) {
    return parseZodException(exception)
  }
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return parsePrismaKnownRequestError(exception)
  }
  if (exception instanceof Prisma.PrismaClientValidationError) {
    return parsePrismaValidationError(exception)
  }
  if (exception instanceof Prisma.PrismaClientInitializationError) {
    return parsePrismaInitializationError(exception)
  }
  if (exception instanceof Error) {
    return parseGenericError(exception)
  }
  return parseUnknownError()
}

export function buildErrorResponse(
  parsed: ParsedExceptionResult,
  requestPath: string
): ErrorResponse {
  const messageKey = parsed.messageKey ?? statusToMessageKey(parsed.status)
  const sanitizedMessage = Array.isArray(parsed.message)
    ? parsed.message.map(m => sanitizeMessage(m))
    : sanitizeMessage(parsed.message)

  const errorResponse: ErrorResponse = {
    statusCode: parsed.status,
    message: sanitizedMessage,
    messageKey,
    error: sanitizeMessage(parsed.error),
    timestamp: toIso(),
    path: requestPath.split('?')[0] ?? '',
  }

  if (parsed.errors && parsed.errors.length > 0) {
    errorResponse.errors = parsed.errors
  }

  return errorResponse
}
