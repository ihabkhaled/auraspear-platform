import { Module } from '@nestjs/common'
import { ComplianceController } from './compliance.controller'
import { ComplianceRepository } from './compliance.repository'
import { ComplianceService } from './compliance.service'
import { AppLogsModule } from '../app-logs/app-logs.module'

@Module({
  imports: [AppLogsModule],
  controllers: [ComplianceController],
  providers: [ComplianceRepository, ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
