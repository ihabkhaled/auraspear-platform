import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { type CreatePlaybookDto, CreatePlaybookSchema } from './dto/create-playbook.dto'
import { ListPlaybooksQuerySchema } from './dto/list-playbooks-query.dto'
import { type UpdatePlaybookDto, UpdatePlaybookSchema } from './dto/update-playbook.dto'
import { SoarService } from './soar.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type {
  SoarPlaybookRecord,
  PaginatedPlaybooks,
  SoarExecutionRecord,
  PaginatedExecutions,
  SoarStats,
} from './soar.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@Controller('soar')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class SoarController {
  constructor(private readonly soarService: SoarService) {}

  @Get('playbooks')
  @RequirePermission(Permission.SOAR_VIEW)
  async listPlaybooks(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedPlaybooks> {
    const { page, limit, sortBy, sortOrder, status, triggerType, query } =
      ListPlaybooksQuerySchema.parse(rawQuery)
    return this.soarService.listPlaybooks(
      tenantId,
      page,
      limit,
      sortBy,
      sortOrder,
      status,
      triggerType,
      query
    )
  }

  @Get('stats')
  @RequirePermission(Permission.SOAR_VIEW)
  async getSoarStats(@TenantId() tenantId: string): Promise<SoarStats> {
    return this.soarService.getSoarStats(tenantId)
  }

  @Get('playbooks/:id')
  @RequirePermission(Permission.SOAR_VIEW)
  async getPlaybookById(
    @Param('id') id: string,
    @TenantId() tenantId: string
  ): Promise<SoarPlaybookRecord> {
    return this.soarService.getPlaybookById(id, tenantId)
  }

  @Post('playbooks')
  @RequirePermission(Permission.SOAR_CREATE)
  async createPlaybook(
    @Body(new ZodValidationPipe(CreatePlaybookSchema)) dto: CreatePlaybookDto,
    @CurrentUser() user: JwtPayload
  ): Promise<SoarPlaybookRecord> {
    return this.soarService.createPlaybook(dto, user)
  }

  @Patch('playbooks/:id')
  @RequirePermission(Permission.SOAR_UPDATE)
  async updatePlaybook(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePlaybookSchema)) dto: UpdatePlaybookDto,
    @CurrentUser() user: JwtPayload
  ): Promise<SoarPlaybookRecord> {
    return this.soarService.updatePlaybook(id, dto, user)
  }

  @Delete('playbooks/:id')
  @RequirePermission(Permission.SOAR_DELETE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deletePlaybook(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    return this.soarService.deletePlaybook(id, tenantId, user.email)
  }

  @Get('executions')
  @RequirePermission(Permission.SOAR_VIEW)
  async listExecutions(
    @TenantId() tenantId: string,
    @Query('playbookId') playbookId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ): Promise<PaginatedExecutions> {
    return this.soarService.listExecutions(
      tenantId,
      playbookId,
      page ? Number.parseInt(page, 10) : undefined,
      limit ? Number.parseInt(limit, 10) : undefined
    )
  }

  @Post('playbooks/:id/execute')
  @RequirePermission(Permission.SOAR_EXECUTE)
  async executePlaybook(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<SoarExecutionRecord> {
    return this.soarService.executePlaybook(id, user)
  }
}
