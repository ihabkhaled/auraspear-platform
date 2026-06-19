import { forwardRef, Module } from '@nestjs/common'
import { AiVulnerabilityController } from './ai-vulnerability.controller'
import { AiVulnerabilityService } from './ai-vulnerability.service'
import { VulnerabilitiesController } from './vulnerabilities.controller'
import { VulnerabilitiesRepository } from './vulnerabilities.repository'
import { VulnerabilitiesService } from './vulnerabilities.service'
import { AiModule } from '../ai/ai.module'
import { AppLogsModule } from '../app-logs/app-logs.module'

@Module({
  imports: [AppLogsModule, forwardRef(() => AiModule)],
  controllers: [VulnerabilitiesController, AiVulnerabilityController],
  providers: [VulnerabilitiesRepository, VulnerabilitiesService, AiVulnerabilityService],
  exports: [VulnerabilitiesService],
})
export class VulnerabilitiesModule {}
