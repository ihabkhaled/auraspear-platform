export interface ErrorResponse {
  statusCode: number
  message: string | string[]
  messageKey: string
  errors?: string[]
  error: string
  timestamp: string
  path: string
}

export interface ParsedExceptionResult {
  status: number
  message: string | string[]
  error: string
  messageKey: string | undefined
  errors: string[] | undefined
  logAction: 'none' | 'warn' | 'error' | 'errorWithStack' | 'unknownError'
  logMessage: string | undefined
  logStack: string | undefined
}
