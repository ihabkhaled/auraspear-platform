import { Injectable, Logger } from '@nestjs/common'
import { AiOpsWorkspaceRepository } from './ai-ops-workspace.repository'
import { buildAiOpsWorkspace } from './ai-ops-workspace.utilities'
import type { AiOpsWorkspace } from './ai-ops-workspace.types'

@Injectable()
export class AiOpsWorkspaceService {
  private readonly logger = new Logger(AiOpsWorkspaceService.name)

  constructor(private readonly aiOpsWorkspaceRepository: AiOpsWorkspaceRepository) {}

  async getWorkspace(tenantId: string): Promise<AiOpsWorkspace> {
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const rawData = await this.aiOpsWorkspaceRepository.fetchWorkspaceData(tenantId, dayAgo)
    return buildAiOpsWorkspace(rawData)
  }
}
