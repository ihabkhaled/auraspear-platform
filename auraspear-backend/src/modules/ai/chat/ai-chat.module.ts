import { Module, forwardRef } from '@nestjs/common'
import { AiChatController } from './ai-chat.controller'
import { AiChatRepository } from './ai-chat.repository'
import { AiChatService } from './ai-chat.service'
import { AiTranscriptController } from './ai-transcript.controller'
import { AiTranscriptService } from './ai-transcript.service'
import { PrismaModule } from '../../../prisma/prisma.module'
import { ConnectorsModule } from '../../connectors/connectors.module'
import { LlmConnectorsModule } from '../../connectors/llm-connectors/llm-connectors.module'
import { MemoryModule } from '../memory/memory.module'

@Module({
  imports: [PrismaModule, ConnectorsModule, LlmConnectorsModule, forwardRef(() => MemoryModule)],
  controllers: [AiChatController, AiTranscriptController],
  providers: [AiChatRepository, AiChatService, AiTranscriptService],
  exports: [AiChatRepository, AiChatService, AiTranscriptService],
})
export class AiChatModule {}
