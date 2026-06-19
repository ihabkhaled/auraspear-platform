import { Module, forwardRef } from '@nestjs/common'
import { EmbeddingService } from './embedding.service'
import { MemoryExtractionService } from './memory-extraction.service'
import { MemoryRetrievalService } from './memory-retrieval.service'
import { RagObservabilityController } from './rag-observability.controller'
import { RagObservabilityService } from './rag-observability.service'
import { UserMemoryController } from './user-memory.controller'
import { UserMemoryService } from './user-memory.service'
import { PrismaModule } from '../../../prisma/prisma.module'
import { ConnectorsModule } from '../../connectors/connectors.module'
import { LlmConnectorsModule } from '../../connectors/llm-connectors/llm-connectors.module'
import { AiChatModule } from '../chat/ai-chat.module'

@Module({
  imports: [PrismaModule, ConnectorsModule, LlmConnectorsModule, forwardRef(() => AiChatModule)],
  controllers: [UserMemoryController, RagObservabilityController],
  providers: [EmbeddingService, MemoryExtractionService, MemoryRetrievalService, RagObservabilityService, UserMemoryService],
  exports: [EmbeddingService, MemoryExtractionService, MemoryRetrievalService, RagObservabilityService, UserMemoryService],
})
export class MemoryModule {}
