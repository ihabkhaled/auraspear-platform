import { forwardRef, Module } from '@nestjs/common'
import { AiIntelController } from './ai-intel.controller'
import { AiIntelService } from './ai-intel.service'
import { IntelController } from './intel.controller'
import { IntelRepository } from './intel.repository'
import { IntelService } from './intel.service'
import { AiModule } from '../ai/ai.module'
import { AppLogsModule } from '../app-logs/app-logs.module'
import { ConnectorsModule } from '../connectors/connectors.module'
import { EntitiesModule } from '../entities/entities.module'

@Module({
  imports: [ConnectorsModule, AppLogsModule, forwardRef(() => AiModule), EntitiesModule],
  controllers: [IntelController, AiIntelController],
  providers: [IntelRepository, IntelService, AiIntelService],
  exports: [IntelService],
})
export class IntelModule {}
