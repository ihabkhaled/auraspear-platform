import type {
  AlertSearchRow,
  CaseSearchRow,
  ChatThreadSearchRow,
  FindingSearchRow,
  IncidentSearchRow,
  MemorySearchRow,
  SearchResult,
} from './semantic-search.types'

export function mapFindingsToResults(rows: FindingSearchRow[]): SearchResult[] {
  return rows.map(r => ({
    id: r.id,
    module: 'findings',
    entityType: 'AiExecutionFinding',
    title: r.title ?? 'Untitled Finding',
    snippet: (r.summary ?? '').slice(0, 200),
    score: 1,
    createdAt: r.createdAt,
  }))
}

export function mapChatThreadsToResults(rows: ChatThreadSearchRow[]): SearchResult[] {
  return rows.map(r => ({
    id: r.id,
    module: 'chatThreads',
    entityType: 'AiChatThread',
    title: r.title ?? 'Untitled Thread',
    snippet: '',
    score: 0.9,
    createdAt: r.createdAt,
  }))
}

export function mapMemoriesToResults(rows: MemorySearchRow[]): SearchResult[] {
  return rows.map(r => ({
    id: r.id,
    module: 'memories',
    entityType: 'UserMemory',
    title: r.content.slice(0, 80),
    snippet: r.content.slice(0, 200),
    score: 0.85,
    createdAt: r.createdAt,
  }))
}

export function mapAlertsToResults(rows: AlertSearchRow[]): SearchResult[] {
  return rows.map(r => ({
    id: r.id,
    module: 'alerts',
    entityType: 'Alert',
    title: r.title,
    snippet: (r.description ?? '').slice(0, 200),
    score: 0.8,
    createdAt: r.createdAt,
  }))
}

export function mapCasesToResults(rows: CaseSearchRow[]): SearchResult[] {
  return rows.map(r => ({
    id: r.id,
    module: 'cases',
    entityType: 'Case',
    title: r.title,
    snippet: (r.description ?? '').slice(0, 200),
    score: 0.8,
    createdAt: r.createdAt,
  }))
}

export function mapIncidentsToResults(rows: IncidentSearchRow[]): SearchResult[] {
  return rows.map(r => ({
    id: r.id,
    module: 'incidents',
    entityType: 'Incident',
    title: r.title,
    snippet: (r.description ?? '').slice(0, 200),
    score: 0.8,
    createdAt: r.createdAt,
  }))
}
