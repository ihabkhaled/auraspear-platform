import { Injectable, Logger } from '@nestjs/common'
import { MemoryExtractionService } from '../../ai/memory/memory-extraction.service'
import type { Job } from '@prisma/client'

@Injectable()
export class MemoryExtractionHandler {
  private readonly logger = new Logger(MemoryExtractionHandler.name)

  constructor(private readonly extractionService: MemoryExtractionService) {}

  async handle(job: Job): Promise<Record<string, unknown>> {
    const payload = job.payload as Record<string, unknown> | null
    const tenantId = payload?.['tenantId'] as string | undefined
    const userId = payload?.['userId'] as string | undefined
    const threadId = payload?.['threadId'] as string | undefined

    if (!tenantId || !userId || !threadId) {
      this.logger.error('Invalid memory extraction payload')
      return { error: 'Invalid payload' }
    }

    this.logger.log(`Processing memory extraction for thread ${threadId}`)
    await this.extractionService.extractFromThread(tenantId, userId, threadId)

    return { threadId, status: 'completed' }
  }
}
