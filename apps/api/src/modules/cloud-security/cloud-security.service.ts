import { Injectable, Logger } from '@nestjs/common'
import { CloudSecurityRepository } from './cloud-security.repository'
import {
  buildAccountListWhere,
  buildAccountOrderBy,
  buildFindingListWhere,
  buildFindingOrderBy,
  buildAccountUpdateData,
  buildAccountRecord,
  buildFindingRecord,
  buildCloudSecurityStats,
} from './cloud-security.utilities'
import {
  AppLogFeature,
  CloudAccountStatus,
  CloudFindingSeverity,
  CloudFindingStatus,
} from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import type {
  CloudAccountRecord,
  CloudSecurityStats,
  PaginatedAccounts,
  PaginatedFindings,
} from './cloud-security.types'
import type { CreateAccountDto } from './dto/create-account.dto'
import type { UpdateAccountDto } from './dto/update-account.dto'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@Injectable()
export class CloudSecurityService {
  private readonly logger = new Logger(CloudSecurityService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: CloudSecurityRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(
      this.appLogger,
      AppLogFeature.CLOUD_SECURITY,
      'CloudSecurityService'
    )
  }

  /* ---------------------------------------------------------------- */
  /* LIST ACCOUNTS (paginated, tenant-scoped)                          */
  /* ---------------------------------------------------------------- */

  async listAccounts(
    tenantId: string,
    page = 1,
    limit = 20,
    sortBy?: string,
    sortOrder?: string,
    provider?: string,
    status?: string
  ): Promise<PaginatedAccounts> {
    this.log.entry('listAccounts', tenantId, { page, limit, provider, status })

    try {
      const where = buildAccountListWhere(tenantId, provider, status)
      const orderBy = buildAccountOrderBy(sortBy, sortOrder)

      const [accounts, total] = await Promise.all([
        this.repository.findManyAccounts({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy,
        }),
        this.repository.countAccounts(where),
      ])

      const data = accounts.map(buildAccountRecord)

      this.log.success('listAccounts', tenantId, { page, limit, total, returnedCount: data.length })

      return {
        data,
        pagination: buildPaginationMeta(page, limit, total),
      }
    } catch (error: unknown) {
      this.log.error('listAccounts', tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* GET ACCOUNT BY ID                                                 */
  /* ---------------------------------------------------------------- */

  async getAccountById(id: string, tenantId: string): Promise<CloudAccountRecord> {
    this.log.entry('getAccountById', tenantId, { accountId: id })

    try {
      const account = await this.repository.findFirstAccount({ id, tenantId })

      if (!account) {
        this.log.warn('getAccountById', tenantId, 'Cloud account not found', { accountId: id })
        throw new BusinessException(
          404,
          `Cloud account ${id} not found`,
          'errors.cloudSecurity.accountNotFound'
        )
      }

      this.log.success('getAccountById', tenantId, { accountId: id })
      return buildAccountRecord(account)
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('getAccountById', tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* CREATE ACCOUNT                                                    */
  /* ---------------------------------------------------------------- */

  async createAccount(dto: CreateAccountDto, user: JwtPayload): Promise<CloudAccountRecord> {
    this.log.entry('createAccount', user.tenantId, {
      provider: dto.provider,
      accountId: dto.accountId,
    })

    try {
      const account = await this.repository.createAccount({
        tenantId: user.tenantId,
        provider: dto.provider,
        accountId: dto.accountId,
        alias: dto.alias ?? null,
        region: dto.region ?? null,
        status: CloudAccountStatus.DISCONNECTED,
      })

      this.log.success('createAccount', user.tenantId, {
        provider: account.provider,
        accountId: account.accountId,
      })
      return buildAccountRecord(account)
    } catch (error: unknown) {
      this.log.error('createAccount', user.tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE ACCOUNT                                                    */
  /* ---------------------------------------------------------------- */

  async updateAccount(
    id: string,
    dto: UpdateAccountDto,
    user: JwtPayload
  ): Promise<CloudAccountRecord> {
    this.log.entry('updateAccount', user.tenantId, {
      accountId: id,
      updatedFields: Object.keys(dto),
    })

    try {
      await this.getAccountById(id, user.tenantId)

      const updated = await this.repository.updateManyAccounts({
        where: { id, tenantId: user.tenantId },
        data: buildAccountUpdateData(dto),
      })

      if (updated.count === 0) {
        throw new BusinessException(
          404,
          `Cloud account ${id} not found`,
          'errors.cloudSecurity.accountNotFound'
        )
      }

      this.log.success('updateAccount', user.tenantId, { accountId: id })
      return this.getAccountById(id, user.tenantId)
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('updateAccount', user.tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* DELETE ACCOUNT                                                    */
  /* ---------------------------------------------------------------- */

  async deleteAccount(id: string, tenantId: string, actor: string): Promise<{ deleted: boolean }> {
    this.log.entry('deleteAccount', tenantId, { accountId: id, actorEmail: actor })

    try {
      const existing = await this.getAccountById(id, tenantId)

      await this.repository.deleteManyAccounts({ id, tenantId })

      this.log.success('deleteAccount', tenantId, {
        provider: existing.provider,
        accountId: existing.accountId,
        actorEmail: actor,
      })
      return { deleted: true }
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('deleteAccount', tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* LIST FINDINGS (paginated, tenant-scoped)                          */
  /* ---------------------------------------------------------------- */

  async listFindings(
    tenantId: string,
    page = 1,
    limit = 20,
    sortBy?: string,
    sortOrder?: string,
    severity?: string,
    status?: string,
    cloudAccountId?: string
  ): Promise<PaginatedFindings> {
    this.log.entry('listFindings', tenantId, { page, limit, severity, status, cloudAccountId })

    try {
      const where = buildFindingListWhere(tenantId, severity, status, cloudAccountId)
      const orderBy = buildFindingOrderBy(sortBy, sortOrder)

      const [findings, total] = await Promise.all([
        this.repository.findManyFindings({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy,
        }),
        this.repository.countFindings(where),
      ])

      const data = findings.map(buildFindingRecord)

      this.log.success('listFindings', tenantId, { page, limit, total, returnedCount: data.length })

      return {
        data,
        pagination: buildPaginationMeta(page, limit, total),
      }
    } catch (error: unknown) {
      this.log.error('listFindings', tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* STATS                                                             */
  /* ---------------------------------------------------------------- */

  async getCloudSecurityStats(tenantId: string): Promise<CloudSecurityStats> {
    this.log.entry('getCloudSecurityStats', tenantId, {})

    try {
      const [
        totalAccounts,
        connectedAccounts,
        disconnectedAccounts,
        errorAccounts,
        totalFindings,
        openFindings,
        resolvedFindings,
        suppressedFindings,
        criticalFindings,
        highFindings,
      ] = await Promise.all([
        this.repository.countAccounts({ tenantId }),
        this.repository.countAccountsByStatus(tenantId, CloudAccountStatus.CONNECTED),
        this.repository.countAccountsByStatus(tenantId, CloudAccountStatus.DISCONNECTED),
        this.repository.countAccountsByStatus(tenantId, CloudAccountStatus.ERROR),
        this.repository.countFindings({ tenantId }),
        this.repository.countFindingsByStatus(tenantId, CloudFindingStatus.OPEN),
        this.repository.countFindingsByStatus(tenantId, CloudFindingStatus.RESOLVED),
        this.repository.countFindingsByStatus(tenantId, CloudFindingStatus.SUPPRESSED),
        this.repository.countFindingsBySeverity(tenantId, CloudFindingSeverity.CRITICAL),
        this.repository.countFindingsBySeverity(tenantId, CloudFindingSeverity.HIGH),
      ])

      this.log.success('getCloudSecurityStats', tenantId, {
        totalAccounts,
        totalFindings,
        criticalFindings,
      })

      return buildCloudSecurityStats(
        totalAccounts,
        connectedAccounts,
        disconnectedAccounts,
        errorAccounts,
        totalFindings,
        openFindings,
        resolvedFindings,
        suppressedFindings,
        criticalFindings,
        highFindings
      )
    } catch (error: unknown) {
      this.log.error('getCloudSecurityStats', tenantId, error)
      throw error
    }
  }
}
