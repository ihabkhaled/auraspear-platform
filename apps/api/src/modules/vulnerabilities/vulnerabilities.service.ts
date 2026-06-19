import { Injectable, Logger } from '@nestjs/common'
import { VulnerabilitiesRepository } from './vulnerabilities.repository'
import {
  buildVulnerabilityListWhere,
  buildVulnerabilityOrderBy,
  buildVulnerabilityUpdateData,
  buildVulnerabilityStats,
  buildVulnerabilityRecord,
  buildVulnerabilityRecordList,
} from './vulnerabilities.utilities'
import { AppLogFeature, PatchStatus, VulnerabilitySeverity } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { daysAgo, nowDate } from '../../common/utils/date-time.utility'
import type { CreateVulnerabilityDto } from './dto/create-vulnerability.dto'
import type { UpdateVulnerabilityDto } from './dto/update-vulnerability.dto'
import type {
  PaginatedVulnerabilities,
  VulnerabilityRecord,
  VulnerabilityStats,
} from './vulnerabilities.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type {
  VulnerabilitySeverity as PrismaVulnerabilitySeverity,
  PatchStatus as PrismaPatchStatus,
} from '@prisma/client'

@Injectable()
export class VulnerabilitiesService {
  private readonly logger = new Logger(VulnerabilitiesService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: VulnerabilitiesRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(
      this.appLogger,
      AppLogFeature.VULNERABILITIES,
      'VulnerabilitiesService'
    )
  }

  async listVulnerabilities(
    tenantId: string,
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: 'asc' | 'desc',
    severity?: string,
    patchStatus?: string,
    exploitAvailable?: string,
    query?: string
  ): Promise<PaginatedVulnerabilities> {
    this.log.entry('listVulnerabilities', tenantId, {
      page,
      limit,
      severity,
      patchStatus,
      exploitAvailable,
      query,
    })

    try {
      const where = buildVulnerabilityListWhere(
        tenantId,
        severity,
        patchStatus,
        exploitAvailable,
        query
      )

      const [data, total] = await Promise.all([
        this.repository.findManyWithTenant(
          where,
          buildVulnerabilityOrderBy(sortBy, sortOrder),
          (page - 1) * limit,
          limit
        ),
        this.repository.count(where),
      ])

      const records = buildVulnerabilityRecordList(data)
      this.log.success('listVulnerabilities', tenantId, {
        page,
        limit,
        total,
        returnedCount: records.length,
      })

      return { data: records, pagination: buildPaginationMeta(page, limit, total) }
    } catch (error: unknown) {
      this.log.error('listVulnerabilities', tenantId, error)
      throw error
    }
  }

  async getVulnerabilityById(id: string, tenantId: string): Promise<VulnerabilityRecord> {
    this.log.entry('getVulnerabilityById', tenantId, { vulnerabilityId: id })

    try {
      const vulnerability = await this.repository.findByIdAndTenant(id, tenantId)

      if (!vulnerability) {
        this.log.warn('getVulnerabilityById', tenantId, 'Vulnerability not found', {
          vulnerabilityId: id,
        })
        throw new BusinessException(
          404,
          'Vulnerability not found',
          'errors.vulnerabilities.notFound'
        )
      }

      this.log.success('getVulnerabilityById', tenantId, { vulnerabilityId: id })
      return buildVulnerabilityRecord(vulnerability)
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('getVulnerabilityById', tenantId, error)
      }
      throw error
    }
  }

  async createVulnerability(
    dto: CreateVulnerabilityDto,
    user: JwtPayload
  ): Promise<VulnerabilityRecord> {
    this.log.entry('createVulnerability', user.tenantId, {
      cveId: dto.cveId,
      severity: dto.severity,
    })

    try {
      const existing = await this.repository.findByCveIdAndTenant(user.tenantId, dto.cveId)

      if (existing) {
        this.log.warn('createVulnerability', user.tenantId, 'Duplicate CVE ID', {
          cveId: dto.cveId,
        })
        throw new BusinessException(
          409,
          `Vulnerability with CVE ID ${dto.cveId} already exists`,
          'errors.vulnerabilities.duplicateCve'
        )
      }

      const vulnerability = await this.repository.createWithTenant({
        tenantId: user.tenantId,
        cveId: dto.cveId,
        cvssScore: dto.cvssScore,
        severity: dto.severity as PrismaVulnerabilitySeverity,
        description: dto.description,
        affectedHosts: dto.affectedHosts,
        exploitAvailable: dto.exploitAvailable,
        patchStatus: dto.patchStatus as PrismaPatchStatus,
        affectedSoftware: dto.affectedSoftware ?? null,
        remediation: dto.remediation ?? null,
        discoveredAt: nowDate(),
      })

      this.log.success('createVulnerability', user.tenantId, {
        cveId: dto.cveId,
        severity: dto.severity,
      })
      return buildVulnerabilityRecord(vulnerability)
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('createVulnerability', user.tenantId, error)
      }
      throw error
    }
  }

  async updateVulnerability(
    id: string,
    dto: UpdateVulnerabilityDto,
    user: JwtPayload
  ): Promise<VulnerabilityRecord> {
    this.log.entry('updateVulnerability', user.tenantId, {
      vulnerabilityId: id,
      updatedFields: Object.keys(dto),
    })

    try {
      const existing = await this.repository.findExistingByIdAndTenant(id, user.tenantId)

      if (!existing) {
        this.log.warn('updateVulnerability', user.tenantId, 'Vulnerability not found', {
          vulnerabilityId: id,
        })
        throw new BusinessException(
          404,
          'Vulnerability not found',
          'errors.vulnerabilities.notFound'
        )
      }

      await this.validateCveIdUniqueness(dto.cveId, existing.cveId, user.tenantId, id)

      const vulnerability = await this.repository.updateByIdAndTenant(
        id,
        user.tenantId,
        buildVulnerabilityUpdateData(dto, existing.patchStatus)
      )

      if (!vulnerability) {
        throw new BusinessException(
          404,
          `Vulnerability ${id} not found after update`,
          'errors.vulnerabilities.notFound'
        )
      }

      this.log.success('updateVulnerability', user.tenantId, {
        vulnerabilityId: id,
        updatedFields: Object.keys(dto),
      })
      return buildVulnerabilityRecord(vulnerability)
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('updateVulnerability', user.tenantId, error)
      }
      throw error
    }
  }

  async deleteVulnerability(
    id: string,
    tenantId: string,
    email: string
  ): Promise<{ deleted: boolean }> {
    this.log.entry('deleteVulnerability', tenantId, { vulnerabilityId: id, email })

    try {
      const existing = await this.repository.findExistingByIdAndTenant(id, tenantId)

      if (!existing) {
        this.log.warn('deleteVulnerability', tenantId, 'Vulnerability not found', {
          vulnerabilityId: id,
        })
        throw new BusinessException(
          404,
          'Vulnerability not found',
          'errors.vulnerabilities.notFound'
        )
      }

      await this.repository.deleteByIdAndTenant(id, tenantId)
      this.log.success('deleteVulnerability', tenantId, {
        vulnerabilityId: id,
        cveId: existing.cveId,
        email,
      })

      return { deleted: true }
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('deleteVulnerability', tenantId, error)
      }
      throw error
    }
  }

  async getVulnerabilityStats(tenantId: string): Promise<VulnerabilityStats> {
    this.log.entry('getVulnerabilityStats', tenantId, {})

    try {
      const thirtyDaysAgo = daysAgo(30)

      const [criticalCount, highCount, mediumCount, patched30dCount, exploitCount] =
        await Promise.all([
          this.repository.count({ tenantId, severity: VulnerabilitySeverity.CRITICAL }),
          this.repository.count({ tenantId, severity: VulnerabilitySeverity.HIGH }),
          this.repository.count({ tenantId, severity: VulnerabilitySeverity.MEDIUM }),
          this.repository.count({
            tenantId,
            patchStatus: PatchStatus.MITIGATED,
            patchedAt: { gte: thirtyDaysAgo },
          }),
          this.repository.count({ tenantId, exploitAvailable: true }),
        ])

      this.log.success('getVulnerabilityStats', tenantId, { criticalCount, highCount, mediumCount })
      return buildVulnerabilityStats(
        criticalCount,
        highCount,
        mediumCount,
        patched30dCount,
        exploitCount
      )
    } catch (error: unknown) {
      this.log.error('getVulnerabilityStats', tenantId, error)
      throw error
    }
  }

  private async validateCveIdUniqueness(
    newCveId: string | undefined,
    existingCveId: string,
    tenantId: string,
    excludeId: string
  ): Promise<void> {
    if (!newCveId || newCveId === existingCveId) return

    const duplicate = await this.repository.findByCveIdAndTenantExcludingId(
      tenantId,
      newCveId,
      excludeId
    )
    if (duplicate) {
      throw new BusinessException(
        409,
        `Vulnerability with CVE ID ${newCveId} already exists`,
        'errors.vulnerabilities.duplicateCve'
      )
    }
  }
}
