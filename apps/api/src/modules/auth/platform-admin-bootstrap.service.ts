import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_NAME } from './auth.constants'
import { PlatformAdminBootstrapRepository } from './platform-admin-bootstrap.repository'
import { resolvePasswordHash } from './platform-admin-bootstrap.utilities'
import { AppLogFeature } from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'

@Injectable()
export class PlatformAdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(PlatformAdminBootstrapService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: PlatformAdminBootstrapRepository,
    private readonly configService: ConfigService,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(
      this.appLogger,
      AppLogFeature.AUTH,
      'PlatformAdminBootstrapService'
    )
  }

  async onModuleInit(): Promise<void> {
    await this.ensurePlatformAdmin()
  }

  async ensurePlatformAdmin(): Promise<void> {
    this.log.entry('platform-admin-bootstrap', 'system')

    try {
      const configuredPassword = this.resolveConfiguredPassword()
      if (configuredPassword.length === 0) {
        this.logger.warn(
          'Platform admin bootstrap skipped because PLATFORM_ADMIN_PASSWORD and SEED_DEFAULT_PASSWORD are not set'
        )
        this.log.skipped('platform-admin-bootstrap', 'system', 'no password configured')
        return
      }

      const platformAdmin = await this.upsertPlatformAdminWithPassword(configuredPassword)
      await this.repository.upsertUserPreference(platformAdmin.id)
      await this.ensureMembershipsForAllTenants(platformAdmin.id)

      this.log.success('platform-admin-bootstrap', 'system', { adminId: platformAdmin.id })
    } catch (error: unknown) {
      this.log.error('platform-admin-bootstrap', 'system', error)
      throw error
    }
  }

  private async upsertPlatformAdminWithPassword(
    configuredPassword: string
  ): Promise<{ id: string }> {
    const existingAdmin = await this.repository.findPlatformAdminByEmail(PLATFORM_ADMIN_EMAIL)
    const passwordHash = await resolvePasswordHash(configuredPassword, existingAdmin?.passwordHash)

    return this.repository.upsertPlatformAdmin({
      email: PLATFORM_ADMIN_EMAIL,
      name: PLATFORM_ADMIN_NAME,
      passwordHash,
    })
  }

  private async ensureMembershipsForAllTenants(userId: string): Promise<void> {
    const tenantIds = await this.repository.findAllTenantIds()
    await Promise.all(
      tenantIds.map(tenantId => this.repository.upsertGlobalAdminMembership(userId, tenantId))
    )

    this.logger.log(
      `Platform admin bootstrap ensured for ${tenantIds.length} tenant${tenantIds.length === 1 ? '' : 's'}`
    )
  }

  private resolveConfiguredPassword(): string {
    const configPassword = this.configService.get<string>('PLATFORM_ADMIN_PASSWORD')
    const seedPassword = process.env['SEED_DEFAULT_PASSWORD']

    return (configPassword ?? seedPassword ?? '').trim()
  }
}
