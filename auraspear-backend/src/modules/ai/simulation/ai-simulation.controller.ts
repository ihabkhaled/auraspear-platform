import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { AiSimulationService } from './ai-simulation.service'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../../common/decorators/permission.decorator'
import { Permission } from '../../../common/enums'
import { AuthGuard } from '../../../common/guards/auth.guard'
import { TenantGuard } from '../../../common/guards/tenant.guard'
import type { JwtPayload } from '../../../common/interfaces/authenticated-request.interface'

@Controller('ai-simulations')
@UseGuards(AuthGuard, TenantGuard)
export class AiSimulationController {
  constructor(private readonly aiSimulationService: AiSimulationService) {}

  @Get()
  @RequirePermission(Permission.AI_SIMULATION_VIEW)
  listSimulations(@CurrentUser() user: JwtPayload) {
    return this.aiSimulationService.listSimulations(user.tenantId)
  }

  @Post()
  @RequirePermission(Permission.AI_SIMULATION_MANAGE)
  createSimulation(
    @Body() body: { name: string; description?: string; agentId: string; datasetJson: unknown },
    @CurrentUser() user: JwtPayload
  ) {
    return this.aiSimulationService.createSimulation(user.tenantId, body, user.sub)
  }

  @Get('stats')
  @RequirePermission(Permission.AI_SIMULATION_VIEW)
  getStats(@CurrentUser() user: JwtPayload) {
    return this.aiSimulationService.getStats(user.tenantId)
  }

  @Get(':id')
  @RequirePermission(Permission.AI_SIMULATION_VIEW)
  getSimulation(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.aiSimulationService.getSimulation(user.tenantId, id)
  }

  @Delete(':id')
  @RequirePermission(Permission.AI_SIMULATION_MANAGE)
  deleteSimulation(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.aiSimulationService.deleteSimulation(user.tenantId, id)
  }
}
