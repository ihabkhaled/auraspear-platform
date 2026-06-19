import { Module } from '@nestjs/common'
import { PromptRegistryController } from './prompt-registry.controller'
import { PromptRegistryRepository } from './prompt-registry.repository'
import { PromptRegistryService } from './prompt-registry.service'
import { AppLogsModule } from '../../app-logs/app-logs.module'

@Module({
  imports: [AppLogsModule],
  controllers: [PromptRegistryController],
  providers: [PromptRegistryRepository, PromptRegistryService],
  exports: [PromptRegistryService],
})
export class PromptRegistryModule {}
