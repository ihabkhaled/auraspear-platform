import { forwardRef, Module, type OnModuleInit } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { MemoryModule } from '../ai/memory/memory.module'
import { OrchestratorModule } from '../ai/orchestrator/orchestrator.module'
import { AiAgentTaskHandler } from '../ai-agents/ai-agent-task.handler'
import { AiAgentsModule } from '../ai-agents/ai-agents.module'
import { AlertsModule } from '../alerts/alerts.module'
import { AppLogsModule } from '../app-logs/app-logs.module'
import { ConnectorsModule } from '../connectors/connectors.module'
import { CorrelationModule } from '../correlation/correlation.module'
import { DetectionRulesModule } from '../detection-rules/detection-rules.module'
import { EntitiesModule } from '../entities/entities.module'
import { HuntsModule } from '../hunts/hunts.module'
import { NormalizationModule } from '../normalization/normalization.module'
import { ReportsModule } from '../reports/reports.module'
import { SoarModule } from '../soar/soar.module'
import { JobType } from './enums/job.enums'
import { ConnectorSyncHandler } from './handlers/connector-sync.handler'
import { CorrelationHandler } from './handlers/correlation.handler'
import { DetectionExecutionHandler } from './handlers/detection-execution.handler'
import { HuntExecutionHandler } from './handlers/hunt-execution.handler'
import { MemoryExtractionHandler } from './handlers/memory-extraction.handler'
import { NormalizationHandler } from './handlers/normalization.handler'
import { ReportGenerationHandler } from './handlers/report-generation.handler'
import { SoarPlaybookHandler } from './handlers/soar-playbook.handler'
import { JobProcessorService } from './job-processor.service'
import { JobSchedulerService } from './job-scheduler.service'
import { JobsController } from './jobs.controller'
import { JobRepository } from './jobs.repository'
import { JobService } from './jobs.service'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    forwardRef(() => AlertsModule),
    forwardRef(() => OrchestratorModule),
    AppLogsModule,
    ConnectorsModule,
    CorrelationModule,
    DetectionRulesModule,
    EntitiesModule,
    forwardRef(() => HuntsModule),
    MemoryModule,
    NormalizationModule,
    ReportsModule,
    SoarModule,
    forwardRef(() => AiAgentsModule),
  ],
  controllers: [JobsController],
  providers: [
    JobRepository,
    JobService,
    JobProcessorService,
    JobSchedulerService,
    ConnectorSyncHandler,
    CorrelationHandler,
    DetectionExecutionHandler,
    HuntExecutionHandler,
    MemoryExtractionHandler,
    NormalizationHandler,
    ReportGenerationHandler,
    SoarPlaybookHandler,
  ],
  exports: [JobService, JobProcessorService],
})
export class JobsModule implements OnModuleInit {
  constructor(
    private readonly processor: JobProcessorService,
    private readonly connectorSyncHandler: ConnectorSyncHandler,
    private readonly correlationHandler: CorrelationHandler,
    private readonly detectionHandler: DetectionExecutionHandler,
    private readonly huntHandler: HuntExecutionHandler,
    private readonly memoryExtractionHandler: MemoryExtractionHandler,
    private readonly normalizationHandler: NormalizationHandler,
    private readonly reportHandler: ReportGenerationHandler,
    private readonly soarHandler: SoarPlaybookHandler,
    private readonly aiAgentTaskHandler: AiAgentTaskHandler
  ) {}

  onModuleInit(): void {
    this.processor.registerHandler(JobType.CONNECTOR_SYNC, job =>
      this.connectorSyncHandler.handle(job)
    )
    this.processor.registerHandler(JobType.CORRELATION_RULE_EXECUTION, job =>
      this.correlationHandler.handle(job)
    )
    this.processor.registerHandler(JobType.DETECTION_RULE_EXECUTION, job =>
      this.detectionHandler.handle(job)
    )
    this.processor.registerHandler(JobType.HUNT_EXECUTION, job => this.huntHandler.handle(job))
    this.processor.registerHandler(JobType.MEMORY_EXTRACTION, job =>
      this.memoryExtractionHandler.handle(job)
    )
    this.processor.registerHandler(JobType.NORMALIZATION_PIPELINE, job =>
      this.normalizationHandler.handle(job)
    )
    this.processor.registerHandler(JobType.REPORT_GENERATION, job => this.reportHandler.handle(job))
    this.processor.registerHandler(JobType.SOAR_PLAYBOOK, job => this.soarHandler.handle(job))
    this.processor.registerHandler(JobType.AI_AGENT_TASK, job =>
      this.aiAgentTaskHandler.handle(job)
    )
  }
}
