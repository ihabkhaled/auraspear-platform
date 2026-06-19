import { Module } from '@nestjs/common'
import { UsageBudgetController } from './usage-budget.controller'
import { UsageBudgetRepository } from './usage-budget.repository'
import { UsageBudgetService } from './usage-budget.service'
import { AppLogsModule } from '../../app-logs/app-logs.module'
import { FeatureCatalogModule } from '../feature-catalog/feature-catalog.module'

@Module({
  imports: [AppLogsModule, FeatureCatalogModule],
  controllers: [UsageBudgetController],
  providers: [UsageBudgetRepository, UsageBudgetService],
  exports: [UsageBudgetService],
})
export class UsageBudgetModule {}
