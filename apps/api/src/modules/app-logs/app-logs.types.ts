import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type { ApplicationLog } from '@prisma/client'

export type ApplicationLogRecord = ApplicationLog

export type PaginatedApplicationLogs = PaginatedResponse<ApplicationLogRecord>
