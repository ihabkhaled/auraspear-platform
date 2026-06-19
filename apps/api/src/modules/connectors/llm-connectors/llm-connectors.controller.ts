import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import {
  CreateLlmConnectorSchema,
  type CreateLlmConnectorDto,
} from './dto/create-llm-connector.dto'
import {
  UpdateLlmConnectorSchema,
  type UpdateLlmConnectorDto,
} from './dto/update-llm-connector.dto'
import { LlmConnectorsService } from './llm-connectors.service'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../../common/decorators/permission.decorator'
import { TenantId } from '../../../common/decorators/tenant-id.decorator'
import { Permission } from '../../../common/enums'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import type { LlmConnectorResponse } from './llm-connectors.types'

@ApiTags('llm-connectors')
@ApiBearerAuth()
@Controller('llm-connectors')
export class LlmConnectorsController {
  constructor(private readonly llmConnectorsService: LlmConnectorsService) {}

  @Get()
  @RequirePermission(Permission.LLM_CONNECTORS_VIEW)
  async list(@TenantId() tenantId: string): Promise<LlmConnectorResponse[]> {
    return this.llmConnectorsService.list(tenantId)
  }

  @Get(':id')
  @RequirePermission(Permission.LLM_CONNECTORS_VIEW)
  async getById(
    @TenantId() tenantId: string,
    @Param('id') id: string
  ): Promise<LlmConnectorResponse> {
    return this.llmConnectorsService.getById(id, tenantId)
  }

  @Post()
  @RequirePermission(Permission.LLM_CONNECTORS_CREATE)
  async create(
    @TenantId() tenantId: string,
    @CurrentUser('email') actorEmail: string,
    @Body(new ZodValidationPipe(CreateLlmConnectorSchema)) dto: CreateLlmConnectorDto
  ): Promise<LlmConnectorResponse> {
    return this.llmConnectorsService.create(tenantId, dto, actorEmail)
  }

  @Patch(':id')
  @RequirePermission(Permission.LLM_CONNECTORS_UPDATE)
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('email') actorEmail: string,
    @Body(new ZodValidationPipe(UpdateLlmConnectorSchema)) dto: UpdateLlmConnectorDto
  ): Promise<LlmConnectorResponse> {
    return this.llmConnectorsService.update(id, tenantId, dto, actorEmail)
  }

  @Delete(':id')
  @RequirePermission(Permission.LLM_CONNECTORS_DELETE)
  async remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('email') actorEmail: string
  ): Promise<{ deleted: boolean }> {
    return this.llmConnectorsService.delete(id, tenantId, actorEmail)
  }

  @Post(':id/test')
  @RequirePermission(Permission.LLM_CONNECTORS_TEST)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async test(
    @TenantId() tenantId: string,
    @Param('id') id: string
  ): Promise<{ id: string; ok: boolean; details: string; testedAt: string }> {
    return this.llmConnectorsService.testConnection(id, tenantId)
  }

  @Post(':id/toggle')
  @RequirePermission(Permission.LLM_CONNECTORS_UPDATE)
  async toggle(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('email') actorEmail: string
  ): Promise<{ id: string; enabled: boolean }> {
    return this.llmConnectorsService.toggle(id, tenantId, actorEmail)
  }
}
