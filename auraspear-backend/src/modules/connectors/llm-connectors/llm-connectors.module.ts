import { Module } from '@nestjs/common'
import { AiAvailableConnectorsController } from './ai-available-connectors.controller'
import { LlmConnectorsController } from './llm-connectors.controller'
import { LlmConnectorsRepository } from './llm-connectors.repository'
import { LlmConnectorsService } from './llm-connectors.service'
import { AppLogsModule } from '../../app-logs/app-logs.module'
import { ConnectorsModule } from '../connectors.module'

@Module({
  imports: [AppLogsModule, ConnectorsModule],
  controllers: [LlmConnectorsController, AiAvailableConnectorsController],
  providers: [LlmConnectorsRepository, LlmConnectorsService],
  exports: [LlmConnectorsService],
})
export class LlmConnectorsModule {}
