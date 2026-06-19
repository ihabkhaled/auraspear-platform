import { forwardRef, Module } from '@nestjs/common'
import { AiReportController } from './ai-report.controller'
import { AiReportService } from './ai-report.service'
import { PdfGeneratorService } from './pdf-generator.service'
import { ReportsGenerationRepository } from './reports-generation.repository'
import { ReportsController } from './reports.controller'
import { ReportsRepository } from './reports.repository'
import { ReportsService } from './reports.service'
import { AiModule } from '../ai/ai.module'
import { AppLogsModule } from '../app-logs/app-logs.module'
import { DashboardsRepository } from '../dashboards/dashboards.repository'
import { JobsModule } from '../jobs/jobs.module'

@Module({
  imports: [AppLogsModule, forwardRef(() => JobsModule), forwardRef(() => AiModule)],
  controllers: [ReportsController, AiReportController],
  providers: [
    ReportsRepository,
    ReportsGenerationRepository,
    ReportsService,
    AiReportService,
    PdfGeneratorService,
    DashboardsRepository,
  ],
  exports: [ReportsRepository, ReportsGenerationRepository, ReportsService, PdfGeneratorService],
})
export class ReportsModule {}
