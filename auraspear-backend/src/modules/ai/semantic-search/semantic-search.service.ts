import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'

export interface SearchResult {
  id: string
  module: string
  entityType: string
  title: string
  snippet: string
  score: number
  createdAt: Date | string
}

@Injectable()
export class SemanticSearchService {
  private readonly logger = new Logger(SemanticSearchService.name)

  constructor(private readonly prisma: PrismaService) {}

  getSearchableModules() {
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
    const results: SearchResult[] = []
    const pattern = `%${query}%`
    const perModule = Math.max(5, Math.ceil(limit / 6))

    const searchModules = modules && modules.length > 0 ? modules : ['findings', 'chatThreads', 'memories', 'alerts', 'cases', 'incidents']

    const searches: Promise<void>[] = []

    if (searchModules.includes('findings')) {
      searches.push(
        this.prisma.aiExecutionFinding
          .findMany({
            where: {
              tenantId,
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { summary: { contains: query, mode: 'insensitive' } },
              ],
            },
            take: perModule,
            orderBy: { createdAt: 'desc' },
          })
          .then(rows => {
            for (const r of rows) {
              results.push({
                id: r.id,
                module: 'findings',
                entityType: 'AiExecutionFinding',
                title: r.title ?? 'Untitled Finding',
                snippet: (r.summary ?? '').slice(0, 200),
                score: 1,
                createdAt: r.createdAt,
              })
            }
          })
      )
    }

    if (searchModules.includes('chatThreads')) {
      searches.push(
        this.prisma.aiChatThread
          .findMany({
            where: {
              tenantId,
              title: { contains: query, mode: 'insensitive' },
            },
            take: perModule,
            orderBy: { updatedAt: 'desc' },
          })
          .then(rows => {
            for (const r of rows) {
              results.push({
                id: r.id,
                module: 'chatThreads',
                entityType: 'AiChatThread',
                title: r.title ?? 'Untitled Thread',
                snippet: '',
                score: 0.9,
                createdAt: r.createdAt,
              })
            }
          })
      )
    }

    if (searchModules.includes('memories')) {
      searches.push(
        this.prisma.userMemory
          .findMany({
            where: {
              tenantId,
              content: { contains: query, mode: 'insensitive' },
            },
            take: perModule,
            orderBy: { createdAt: 'desc' },
          })
          .then(rows => {
            for (const r of rows) {
              results.push({
                id: r.id,
                module: 'memories',
                entityType: 'UserMemory',
                title: r.content.slice(0, 80),
                snippet: r.content.slice(0, 200),
                score: 0.85,
                createdAt: r.createdAt,
              })
            }
          })
      )
    }

    if (searchModules.includes('alerts')) {
      searches.push(
        this.prisma.alert
          .findMany({
            where: {
              tenantId,
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ],
            },
            take: perModule,
            orderBy: { createdAt: 'desc' },
          })
          .then(rows => {
            for (const r of rows) {
              results.push({
                id: r.id,
                module: 'alerts',
                entityType: 'Alert',
                title: r.title,
                snippet: (r.description ?? '').slice(0, 200),
                score: 0.8,
                createdAt: r.createdAt,
              })
            }
          })
      )
    }

    if (searchModules.includes('cases')) {
      searches.push(
        this.prisma.case
          .findMany({
            where: {
              tenantId,
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ],
            },
            take: perModule,
            orderBy: { createdAt: 'desc' },
          })
          .then(rows => {
            for (const r of rows) {
              results.push({
                id: r.id,
                module: 'cases',
                entityType: 'Case',
                title: r.title,
                snippet: (r.description ?? '').slice(0, 200),
                score: 0.8,
                createdAt: r.createdAt,
              })
            }
          })
      )
    }

    if (searchModules.includes('incidents')) {
      searches.push(
        this.prisma.incident
          .findMany({
            where: {
              tenantId,
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ],
            },
            take: perModule,
            orderBy: { createdAt: 'desc' },
          })
          .then(rows => {
            for (const r of rows) {
              results.push({
                id: r.id,
                module: 'incidents',
                entityType: 'Incident',
                title: r.title,
                snippet: (r.description ?? '').slice(0, 200),
                score: 0.8,
                createdAt: r.createdAt,
              })
            }
          })
      )
    }

    await Promise.all(searches)

    results.sort((a, b) => b.score - a.score)

    return results.slice(0, limit)
  }
}
