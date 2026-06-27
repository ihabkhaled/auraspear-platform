import { Injectable, Logger } from '@nestjs/common'
import { ALL_SEARCH_MODULES } from './semantic-search.constants'
import { SemanticSearchRepository } from './semantic-search.repository'
import {
  mapAlertsToResults,
  mapCasesToResults,
  mapChatThreadsToResults,
  mapFindingsToResults,
  mapIncidentsToResults,
  mapMemoriesToResults,
} from './semantic-search.utilities'
import type { SearchResult } from './semantic-search.types'

@Injectable()
export class SemanticSearchService {
  private readonly logger = new Logger(SemanticSearchService.name)

  constructor(private readonly semanticSearchRepository: SemanticSearchRepository) {}

  getSearchableModules(): Array<{ key: string; label: string }> {
    return [
      { key: 'findings', label: 'AI Findings' },
      { key: 'chatThreads', label: 'Chat Threads' },
      { key: 'memories', label: 'AI Memories' },
      { key: 'alerts', label: 'Alerts' },
      { key: 'cases', label: 'Cases' },
      { key: 'incidents', label: 'Incidents' },
    ]
  }

  async search(
    tenantId: string,
    query: string,
    modules?: string[],
    limit = 25
  ): Promise<SearchResult[]> {
    const perModule = Math.max(5, Math.ceil(limit / 6))
    const searchModules = modules && modules.length > 0 ? modules : ALL_SEARCH_MODULES
    const searches = this.buildSearchPromises(tenantId, query, perModule, searchModules)
    const resultGroups = await Promise.all(searches)
    const results = resultGroups.flat()
    results.sort((a, b) => b.score - a.score)
    return results.slice(0, limit)
  }

  private buildSearchPromises(
    tenantId: string,
    query: string,
    perModule: number,
    searchModules: string[]
  ): Array<Promise<SearchResult[]>> {
    const searches: Array<Promise<SearchResult[]>> = []
    if (searchModules.includes('findings')) {
      searches.push(
        this.semanticSearchRepository
          .findFindings(tenantId, query, perModule)
          .then(mapFindingsToResults)
      )
    }
    if (searchModules.includes('chatThreads')) {
      searches.push(
        this.semanticSearchRepository
          .findChatThreads(tenantId, query, perModule)
          .then(mapChatThreadsToResults)
      )
    }
    if (searchModules.includes('memories')) {
      searches.push(
        this.semanticSearchRepository
          .findMemories(tenantId, query, perModule)
          .then(mapMemoriesToResults)
      )
    }
    if (searchModules.includes('alerts')) {
      searches.push(
        this.semanticSearchRepository
          .findAlerts(tenantId, query, perModule)
          .then(mapAlertsToResults)
      )
    }
    if (searchModules.includes('cases')) {
      searches.push(
        this.semanticSearchRepository.findCases(tenantId, query, perModule).then(mapCasesToResults)
      )
    }
    if (searchModules.includes('incidents')) {
      searches.push(
        this.semanticSearchRepository
          .findIncidents(tenantId, query, perModule)
          .then(mapIncidentsToResults)
      )
    }
    return searches
  }
}
