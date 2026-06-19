import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UsePipes,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { ImpersonateUserSchema, type ImpersonateUserDto } from './dto/impersonate-user.dto'
import { ListTenantsQuerySchema } from './dto/list-tenants-query.dto'
import { ListUsersQuerySchema } from './dto/list-users-query.dto'
import {
  CreateTenantSchema,
  type CreateTenantDto,
  UpdateTenantSchema,
  type UpdateTenantDto,
  AddUserSchema,
  type AddUserDto,
  AssignUserSchema,
  type AssignUserDto,
  CheckEmailSchema,
  UpdateUserSchema,
  type UpdateUserDto,
} from './dto/tenant.dto'
import { TenantsService } from './tenants.service'
import { assertTenantAccess } from './tenants.utilities'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { UserRole } from '../../common/interfaces/authenticated-request.interface'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { issueCsrfToken, setAuthCookies } from '../auth/auth-cookie.utility'
import type {
  TenantMember,
  TenantMemberLimited,
  TenantRecord,
  TenantWithCounts,
  UserRecord,
  PaginatedResult,
  CheckEmailResult,
  ImpersonateUserResponse,
} from './tenants.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { Response } from 'express'

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @RequirePermission(Permission.ADMIN_TENANTS_VIEW)
  async listTenants(
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedResult<TenantWithCounts>> {
    const { page, limit, search, sortBy, sortOrder } = ListTenantsQuerySchema.parse(rawQuery)
    return this.tenantsService.findAll(page, limit, search, sortBy, sortOrder)
  }

  @Post()
  @RequirePermission(Permission.ADMIN_TENANTS_CREATE)
  @UsePipes(new ZodValidationPipe(CreateTenantSchema))
  async createTenant(@Body() dto: CreateTenantDto): Promise<TenantRecord> {
    return this.tenantsService.create(dto)
  }

  @Get('current')
  async getCurrentTenant(@TenantId() tenantId: string): Promise<TenantWithCounts> {
    return this.tenantsService.findById(tenantId)
  }

  /**
   * Lightweight member list for assignee pickers — any authenticated user.
   * Admin users receive full details (id, name, email).
   * Non-admin users receive limited details (id, name) to prevent member enumeration.
   */
  @Get('current/members')
  async getCurrentTenantMembers(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<Array<TenantMember | TenantMemberLimited>> {
    const members = await this.tenantsService.findMembers(tenantId)
    const isAdmin = user.role === UserRole.GLOBAL_ADMIN || user.role === UserRole.TENANT_ADMIN
    if (isAdmin) {
      return members
    }
    return members.map(({ id, name }) => ({ id, name }))
  }

  @Patch(':id')
  @RequirePermission(Permission.ADMIN_TENANTS_UPDATE)
  async updateTenant(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTenantSchema)) dto: UpdateTenantDto,
    @CurrentUser() user: JwtPayload
  ): Promise<TenantRecord> {
    assertTenantAccess(user, id)
    return this.tenantsService.update(id, dto)
  }

  @Delete(':id')
  @RequirePermission(Permission.ADMIN_TENANTS_DELETE)
  async deleteTenant(@Param('id') id: string): Promise<{ deleted: boolean }> {
    return this.tenantsService.remove(id)
  }

  // ─── User Management ────────────────────────────────

  @Get(':id/users')
  @RequirePermission(Permission.ADMIN_USERS_VIEW)
  async listUsers(
    @Param('id') tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedResult<UserRecord>> {
    assertTenantAccess(user, tenantId)
    const { page, limit, search, sortBy, sortOrder, role, status } =
      ListUsersQuerySchema.parse(rawQuery)
    return this.tenantsService.findUsers(
      tenantId,
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      role,
      status
    )
  }

  @Get(':id/users/check-email')
  @RequirePermission(Permission.ADMIN_USERS_VIEW)
  async checkEmail(
    @Param('id') tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query() rawQuery: Record<string, string>
  ): Promise<CheckEmailResult> {
    assertTenantAccess(user, tenantId)
    const { email } = CheckEmailSchema.parse(rawQuery)
    return this.tenantsService.checkEmail(tenantId, email)
  }

  @Post(':id/users')
  @RequirePermission(Permission.ADMIN_USERS_CREATE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async addUser(
    @Param('id') tenantId: string,
    @Body(new ZodValidationPipe(AddUserSchema)) dto: AddUserDto,
    @CurrentUser() user: JwtPayload
  ): Promise<UserRecord> {
    assertTenantAccess(user, tenantId)
    return this.tenantsService.addUser(tenantId, dto, user.role)
  }

  @Post(':id/users/assign')
  @RequirePermission(Permission.ADMIN_USERS_UPDATE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async assignUser(
    @Param('id') tenantId: string,
    @Body(new ZodValidationPipe(AssignUserSchema)) dto: AssignUserDto,
    @CurrentUser() user: JwtPayload
  ): Promise<UserRecord> {
    assertTenantAccess(user, tenantId)
    return this.tenantsService.assignUser(tenantId, dto, user.role, user.sub, user.email)
  }

  @Patch(':tenantId/users/:userId')
  @RequirePermission(Permission.ADMIN_USERS_UPDATE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async updateUser(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload
  ): Promise<UserRecord> {
    assertTenantAccess(user, tenantId)
    return this.tenantsService.updateUser(tenantId, userId, dto, user.role, user.sub, user.email)
  }

  @Delete(':tenantId/users/:userId')
  @RequirePermission(Permission.ADMIN_USERS_DELETE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async removeUser(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    assertTenantAccess(user, tenantId)
    return this.tenantsService.removeUser(tenantId, userId, user.role, user.sub, user.email)
  }

  @Post(':tenantId/users/:userId/restore')
  @RequirePermission(Permission.ADMIN_USERS_RESTORE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async restoreUser(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<UserRecord> {
    assertTenantAccess(user, tenantId)
    return this.tenantsService.restoreUser(tenantId, userId, user.role, user.sub, user.email)
  }

  @Post(':tenantId/users/:userId/block')
  @RequirePermission(Permission.ADMIN_USERS_BLOCK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async blockUser(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<UserRecord> {
    assertTenantAccess(user, tenantId)
    return this.tenantsService.blockUser(tenantId, userId, user.role, user.sub, user.email)
  }

  @Post(':tenantId/users/:userId/unblock')
  @RequirePermission(Permission.ADMIN_USERS_BLOCK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async unblockUser(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<UserRecord> {
    assertTenantAccess(user, tenantId)
    return this.tenantsService.unblockUser(tenantId, userId, user.role, user.sub, user.email)
  }

  // ─── Impersonation ────────────────────────────────

  @Post(':tenantId/users/:userId/impersonate')
  @RequirePermission(Permission.ADMIN_USERS_UPDATE)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async impersonateUser(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(ImpersonateUserSchema)) _dto: ImpersonateUserDto,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) response: Response
  ): Promise<ImpersonateUserResponse> {
    assertTenantAccess(user, tenantId)
    const session = await this.tenantsService.impersonateUser(tenantId, userId, user)
    setAuthCookies(response, session.accessToken, session.refreshToken)
    const csrfToken = issueCsrfToken(response)

    return {
      accessToken: session.accessToken,
      csrfToken,
      user: session.user,
      impersonator: session.impersonator,
    }
  }
}
