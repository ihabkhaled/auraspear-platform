import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { ConnectorsService } from './connectors.service'
import {
  CreateConnectorSchema,
  type CreateConnectorDto,
  UpdateConnectorSchema,
  type UpdateConnectorDto,
} from './dto/connector.dto'
import { ToggleConnectorSchema, type ToggleConnectorDto } from './dto/toggle-connector.dto'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { ConnectorResponse, ConnectorStats, ConnectorTestResult } from './connectors.types'

@ApiTags('connectors')
@ApiBearerAuth()
@Controller('connectors')
export class ConnectorsController {
  constructor(private readonly connectorsService: ConnectorsService) {}

  @Get()
  @RequirePermission(Permission.CONNECTORS_VIEW)
  async list(@TenantId() tenantId: string): Promise<ConnectorResponse[]> {
    return this.connectorsService.findAll(tenantId)
  }

  @Get('stats')
  @RequirePermission(Permission.CONNECTORS_VIEW)
  async getStats(@TenantId() tenantId: string): Promise<ConnectorStats> {
    return this.connectorsService.getStats(tenantId)
  }

  @Get(':type')
  @RequirePermission(Permission.CONNECTORS_VIEW)
  async getByType(
    @TenantId() tenantId: string,
    @Param('type') type: string
  ): Promise<ConnectorResponse> {
    return this.connectorsService.findByType(tenantId, type)
  }

  @Post()
  @RequirePermission(Permission.CONNECTORS_CREATE)
  async create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(CreateConnectorSchema)) dto: CreateConnectorDto
  ): Promise<ConnectorResponse> {
    return this.connectorsService.create(tenantId, dto)
  }

  @Patch(':type')
  @RequirePermission(Permission.CONNECTORS_UPDATE)
  async update(
    @TenantId() tenantId: string,
    @Param('type') type: string,
    @Body(new ZodValidationPipe(UpdateConnectorSchema)) dto: UpdateConnectorDto
  ): Promise<ConnectorResponse> {
    return this.connectorsService.update(tenantId, type, dto)
  }

  @Delete(':type')
  @RequirePermission(Permission.CONNECTORS_DELETE)
  async remove(
    @TenantId() tenantId: string,
    @Param('type') type: string
  ): Promise<{ deleted: boolean }> {
    return this.connectorsService.remove(tenantId, type)
  }

  @Post(':type/test')
  @RequirePermission(Permission.CONNECTORS_TEST)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async test(
    @TenantId() tenantId: string,
    @Param('type') type: string
  ): Promise<ConnectorTestResult> {
    return this.connectorsService.testConnection(tenantId, type)
  }

  @Post(':type/toggle')
  @RequirePermission(Permission.CONNECTORS_UPDATE)
  async toggle(
    @TenantId() tenantId: string,
    @Param('type') type: string,
    @Body(new ZodValidationPipe(ToggleConnectorSchema)) dto: ToggleConnectorDto
  ): Promise<{ type: string; enabled: boolean }> {
    return this.connectorsService.toggle(tenantId, type, dto.enabled)
  }
}
