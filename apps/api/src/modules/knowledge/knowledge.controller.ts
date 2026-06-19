import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { type CreateRunbookDto, CreateRunbookSchema } from './dto/create-runbook.dto'
import { ListRunbooksQuerySchema } from './dto/list-runbooks-query.dto'
import { type UpdateRunbookDto, UpdateRunbookSchema } from './dto/update-runbook.dto'
import { KnowledgeService } from './knowledge.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { RunbookResponse } from './knowledge.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'

@Controller('runbooks')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  @RequirePermission(Permission.RUNBOOKS_VIEW)
  async list(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedResponse<RunbookResponse>> {
    const params = ListRunbooksQuerySchema.parse(rawQuery)
    return this.knowledgeService.list(tenantId, params)
  }

  @Get('search')
  @RequirePermission(Permission.RUNBOOKS_VIEW)
  async search(
    @TenantId() tenantId: string,
    @Query('q') query: string
  ): Promise<RunbookResponse[]> {
    return this.knowledgeService.search(tenantId, query ?? '')
  }

  @Get(':id')
  @RequirePermission(Permission.RUNBOOKS_VIEW)
  async getById(@Param('id') id: string, @TenantId() tenantId: string): Promise<RunbookResponse> {
    return this.knowledgeService.getById(tenantId, id)
  }

  @Post()
  @RequirePermission(Permission.RUNBOOKS_CREATE)
  async create(
    @Body(new ZodValidationPipe(CreateRunbookSchema)) dto: CreateRunbookDto,
    @CurrentUser() user: JwtPayload
  ): Promise<RunbookResponse> {
    return this.knowledgeService.create(user.tenantId, dto, user.email)
  }

  @Patch(':id')
  @RequirePermission(Permission.RUNBOOKS_UPDATE)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRunbookSchema)) dto: UpdateRunbookDto,
    @CurrentUser() user: JwtPayload
  ): Promise<RunbookResponse> {
    return this.knowledgeService.update(user.tenantId, id, dto, user.email)
  }

  @Delete(':id')
  @RequirePermission(Permission.RUNBOOKS_DELETE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async delete(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    return this.knowledgeService.delete(tenantId, id, user.email)
  }
}
