import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import {
  UpdateRolePermissionsSchema,
  type UpdateRolePermissionsDto,
} from './dto/update-role-permissions.dto'
import { RoleSettingsService } from './role-settings.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@ApiTags('role-settings')
@Controller('role-settings')
@ApiBearerAuth()
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class RoleSettingsController {
  constructor(private readonly roleSettingsService: RoleSettingsService) {}

  @Get('definitions')
  @RequirePermission(Permission.ROLE_SETTINGS_VIEW)
  async getPermissionDefinitions(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<Array<{ key: string; module: string; labelKey: string; sortOrder: number }>> {
    return this.roleSettingsService.getPermissionDefinitions(tenantId, user.role)
  }

  @Get()
  @RequirePermission(Permission.ROLE_SETTINGS_VIEW)
  async getPermissionMatrix(
    @TenantId() tenantId: string
  ): Promise<{ matrix: Record<string, string[]>; configurableRoles: string[] }> {
    const matrix = await this.roleSettingsService.getPermissionMatrix(tenantId)
    const configurableRoles = this.roleSettingsService.getConfigurableRoles()
    return { matrix, configurableRoles }
  }

  @Put()
  @RequirePermission(Permission.ROLE_SETTINGS_UPDATE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async updatePermissionMatrix(
    @Body(new ZodValidationPipe(UpdateRolePermissionsSchema)) dto: UpdateRolePermissionsDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ matrix: Record<string, string[]>; configurableRoles: string[] }> {
    const matrix = await this.roleSettingsService.updatePermissionMatrix(
      tenantId,
      dto.matrix,
      user.email,
      user.sub,
      user.role
    )
    const configurableRoles = this.roleSettingsService.getConfigurableRoles()
    return { matrix, configurableRoles }
  }

  @Post('reset')
  @RequirePermission(Permission.ROLE_SETTINGS_UPDATE)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async resetToDefaults(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ matrix: Record<string, string[]>; configurableRoles: string[] }> {
    const matrix = await this.roleSettingsService.resetToDefaults(
      tenantId,
      user.email,
      user.sub,
      user.role
    )
    const configurableRoles = this.roleSettingsService.getConfigurableRoles()
    return { matrix, configurableRoles }
  }
}
