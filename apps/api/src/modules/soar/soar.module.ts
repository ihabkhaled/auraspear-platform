import { forwardRef, Module } from '@nestjs/common'
import { AiSoarController } from './ai-soar.controller'
import { AiSoarService } from './ai-soar.service'
import { SoarController } from './soar.controller'
import { SoarRepository } from './soar.repository'
import { SoarService } from './soar.service'
import { AiModule } from '../ai/ai.module'
import { AppLogsModule } from '../app-logs/app-logs.module'

@Module({
  imports: [AppLogsModule, forwardRef(() => AiModule)],
  controllers: [SoarController, AiSoarController],
  providers: [SoarRepository, SoarService, AiSoarService],
  exports: [SoarRepository, SoarService],
})
export class SoarModule {}
