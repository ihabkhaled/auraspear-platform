// Types for the semantic search service. Extracted from the service to satisfy
// the no-inline-declarations rule (apps/api CLAUDE.md rule 13 / audit BE-05).

export interface SearchResult {
  id: string
  module: string
  entityType: string
  title: string
  snippet: string
  score: number
  createdAt: Date | string
}
