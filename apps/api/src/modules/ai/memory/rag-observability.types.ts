// Types for the RAG observability service. Extracted from the service to satisfy
// the no-inline-declarations rule (apps/api CLAUDE.md rule 13 / audit BE-05).

import type { RetrievedMemory } from './memory.types'

export interface RagStats {
  totalRetrievals24h: number
  avgMemoriesPerRetrieval: number
  avgSimilarityScore: number
  topCategories: Array<{ category: string; count: number }>
}

export interface RagTraceResult {
  query: string
  memoriesRetrieved: RetrievedMemory[]
  totalMemoriesScanned: number
  embeddingModel: string | null
  similarityThreshold: number
  topN: number
  retrievalDurationMs: number
}
