import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { CloudSecurityService } from './cloud-security.service'
import { type CreateAccountDto, CreateAccountSchema } from './dto/create-account.dto'
import { ListAccountsQuerySchema } from './dto/list-accounts-query.dto'
import { ListFindingsQuerySchema } from './dto/list-findings-query.dto'
import { type UpdateAccountDto, UpdateAccountSchema } from './dto/update-account.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type {
  CloudAccountRecord,
  CloudSecurityStats,
  PaginatedAccounts,
  PaginatedFindings,
} from './cloud-security.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@Controller('cloud-security')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class CloudSecurityController {
  constructor(private readonly cloudSecurityService: CloudSecurityService) {}

  @Get('stats')
  @RequirePermission(Permission.CLOUD_SECURITY_VIEW)
  async getStats(@TenantId() tenantId: string): Promise<CloudSecurityStats> {
    return this.cloudSecurityService.getCloudSecurityStats(tenantId)
  }

  @Get('accounts')
  @RequirePermission(Permission.CLOUD_SECURITY_VIEW)
  async listAccounts(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedAccounts> {
    const { page, limit, sortBy, sortOrder, provider, status } =
      ListAccountsQuerySchema.parse(rawQuery)
    return this.cloudSecurityService.listAccounts(
      tenantId,
      page,
      limit,
      sortBy,
      sortOrder,
      provider,
      status
    )
  }

  @Get('accounts/stats')
  @RequirePermission(Permission.CLOUD_SECURITY_VIEW)
  async getCloudSecurityStats(@TenantId() tenantId: string): Promise<CloudSecurityStats> {
    return this.cloudSecurityService.getCloudSecurityStats(tenantId)
  }

  @Get('accounts/:id')
  @RequirePermission(Permission.CLOUD_SECURITY_VIEW)
  async getAccountById(
    @Param('id') id: string,
    @TenantId() tenantId: string
  ): Promise<CloudAccountRecord> {
    return this.cloudSecurityService.getAccountById(id, tenantId)
  }

  @Post('accounts')
  @RequirePermission(Permission.CLOUD_SECURITY_CREATE)
  async createAccount(
    @Body(new ZodValidationPipe(CreateAccountSchema)) dto: CreateAccountDto,
    @CurrentUser() user: JwtPayload
  ): Promise<CloudAccountRecord> {
    return this.cloudSecurityService.createAccount(dto, user)
  }

  @Patch('accounts/:id')
  @RequirePermission(Permission.CLOUD_SECURITY_UPDATE)
  async updateAccount(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAccountSchema)) dto: UpdateAccountDto,
    @CurrentUser() user: JwtPayload
  ): Promise<CloudAccountRecord> {
    return this.cloudSecurityService.updateAccount(id, dto, user)
  }

  @Delete('accounts/:id')
  @RequirePermission(Permission.CLOUD_SECURITY_DELETE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteAccount(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    return this.cloudSecurityService.deleteAccount(id, tenantId, user.email)
  }

  @Get('findings')
  @RequirePermission(Permission.CLOUD_SECURITY_VIEW)
  async listFindings(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedFindings> {
    const { page, limit, sortBy, sortOrder, severity, status, cloudAccountId } =
      ListFindingsQuerySchema.parse(rawQuery)
    return this.cloudSecurityService.listFindings(
      tenantId,
      page,
      limit,
      sortBy,
      sortOrder,
      severity,
      status,
      cloudAccountId
    )
  }
}
