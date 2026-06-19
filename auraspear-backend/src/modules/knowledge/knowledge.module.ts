import { forwardRef, Module } from '@nestjs/common'
import { AiKnowledgeController } from './ai-knowledge.controller'
import { AiKnowledgeService } from './ai-knowledge.service'
import { KnowledgeController } from './knowledge.controller'
import { KnowledgeRepository } from './knowledge.repository'
import { KnowledgeService } from './knowledge.service'
import { AiModule } from '../ai/ai.module'
import { AppLogsModule } from '../app-logs/app-logs.module'

@Module({
  imports: [AppLogsModule, forwardRef(() => AiModule)],
  controllers: [KnowledgeController, AiKnowledgeController],
  providers: [KnowledgeService, KnowledgeRepository, AiKnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
