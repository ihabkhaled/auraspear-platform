import { Injectable, Logger } from '@nestjs/common'
import { ConnectorsService } from '../../connectors/connectors.service'
import { LlmConnectorsService } from '../../connectors/llm-connectors/llm-connectors.service'
import { LlmApisService } from '../../connectors/services/llm-apis.service'

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name)

  constructor(
    private readonly llmApisService: LlmApisService,
    private readonly connectorsService: ConnectorsService,
    private readonly llmConnectorsService: LlmConnectorsService
  ) {}

  async generateEmbedding(tenantId: string, text: string): Promise<number[]> {
    const config = await this.resolveEmbeddingConfig(tenantId)
    if (!config) {
      this.logger.warn('No embedding-capable connector found, returning empty embedding')
      return []
    }

    return this.llmApisService.generateEmbedding(config, text)
  }

  async generateEmbeddings(tenantId: string, texts: string[]): Promise<number[][]> {
    const config = await this.resolveEmbeddingConfig(tenantId)
    if (!config) {
      return texts.map(() => [])
    }

    const results: number[][] = []
    for (const text of texts) {
      const emb = await this.llmApisService.generateEmbedding(config, text)
      results.push(emb)
    }
    return results
  }

  private async resolveEmbeddingConfig(tenantId: string): Promise<Record<string, unknown> | null> {
    // Try fixed llm_apis connector first
    const fixedConfig = await this.connectorsService.getDecryptedConfig(tenantId, 'llm_apis')
    if (fixedConfig) return fixedConfig

    // Try custom LLM connectors
    const enabledConfigs = await this.llmConnectorsService.getEnabledConfigs(tenantId)
    const first = enabledConfigs.at(0)
    if (first) return first.config

    return null
  }
}
