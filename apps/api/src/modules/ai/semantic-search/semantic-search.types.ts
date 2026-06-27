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

// Raw row shapes returned by each repository search method
export interface FindingSearchRow {
  id: string
  title: string | null
  summary: string | null
  createdAt: Date
}

export interface ChatThreadSearchRow {
  id: string
  title: string | null
  createdAt: Date
}

export interface MemorySearchRow {
  id: string
  content: string
  createdAt: Date
}

export interface AlertSearchRow {
  id: string
  title: string
  description: string | null
  createdAt: Date
}

export interface CaseSearchRow {
  id: string
  title: string
  description: string | null
  createdAt: Date
}

export interface IncidentSearchRow {
  id: string
  title: string
  description: string | null
  createdAt: Date
}
