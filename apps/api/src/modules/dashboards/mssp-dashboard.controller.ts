import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { MsspDashboardService } from './mssp-dashboard.service'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { Permission } from '../../common/enums'
import type { MsspPortfolioOverview, MsspTenantComparison } from '../entities/entities.types'

@ApiTags('dashboards')
@ApiBearerAuth()
@Controller('dashboards/mssp')
export class MsspDashboardController {
  constructor(private readonly msspDashboardService: MsspDashboardService) {}

  @Get('portfolio')
  @RequirePermission(Permission.MSSP_DASHBOARD_VIEW)
  async getPortfolioOverview(): Promise<MsspPortfolioOverview> {
    return this.msspDashboardService.getPortfolioOverview()
  }

  @Get('comparison')
  @RequirePermission(Permission.MSSP_DASHBOARD_VIEW)
  async getTenantComparison(): Promise<MsspTenantComparison> {
    return this.msspDashboardService.getTenantComparison()
  }
}
