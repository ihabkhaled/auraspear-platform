import { forwardRef, Module } from '@nestjs/common'
import { AiDashboardController } from './ai-dashboard.controller'
import { AiDashboardService } from './ai-dashboard.service'
import { DashboardsController } from './dashboards.controller'
import { DashboardsRepository } from './dashboards.repository'
import { DashboardsService } from './dashboards.service'
import { MsspDashboardController } from './mssp-dashboard.controller'
import { MsspDashboardRepository } from './mssp-dashboard.repository'
import { MsspDashboardService } from './mssp-dashboard.service'
import { AiModule } from '../ai/ai.module'
import { AppLogsModule } from '../app-logs/app-logs.module'
import { ConnectorsModule } from '../connectors/connectors.module'

@Module({
  imports: [ConnectorsModule, AppLogsModule, forwardRef(() => AiModule)],
  controllers: [DashboardsController, AiDashboardController, MsspDashboardController],
  providers: [
    DashboardsService,
    DashboardsRepository,
    AiDashboardService,
    MsspDashboardService,
    MsspDashboardRepository,
  ],
})
export class DashboardsModule {}
