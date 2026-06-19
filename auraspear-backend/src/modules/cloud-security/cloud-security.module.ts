import { forwardRef, Module } from '@nestjs/common'
import { AiCloudSecurityController } from './ai-cloud-security.controller'
import { AiCloudSecurityService } from './ai-cloud-security.service'
import { CloudSecurityController } from './cloud-security.controller'
import { CloudSecurityRepository } from './cloud-security.repository'
import { CloudSecurityService } from './cloud-security.service'
import { AiModule } from '../ai/ai.module'
import { AppLogsModule } from '../app-logs/app-logs.module'

@Module({
  imports: [AppLogsModule, forwardRef(() => AiModule)],
  controllers: [CloudSecurityController, AiCloudSecurityController],
  providers: [CloudSecurityRepository, CloudSecurityService, AiCloudSecurityService],
  exports: [CloudSecurityService],
})
export class CloudSecurityModule {}
