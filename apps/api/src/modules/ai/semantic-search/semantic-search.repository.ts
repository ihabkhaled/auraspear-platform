import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import type {
  AlertSearchRow,
  CaseSearchRow,
  ChatThreadSearchRow,
  FindingSearchRow,
  IncidentSearchRow,
  MemorySearchRow,
} from './semantic-search.types'

@Injectable()
export class SemanticSearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findFindings(tenantId: string, query: string, take: number): Promise<FindingSearchRow[]> {
    return this.prisma.aiExecutionFinding.findMany({
      where: {
        tenantId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { summary: { contains: query, mode: 'insensitive' } },
        ],
      },
      take,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, summary: true, createdAt: true },
    })
  }

  async findChatThreads(
    tenantId: string,
    query: string,
    take: number
  ): Promise<ChatThreadSearchRow[]> {
    return this.prisma.aiChatThread.findMany({
      where: {
        tenantId,
        title: { contains: query, mode: 'insensitive' },
      },
      take,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true },
    })
  }

  async findMemories(tenantId: string, query: string, take: number): Promise<MemorySearchRow[]> {
    return this.prisma.userMemory.findMany({
      where: {
        tenantId,
        content: { contains: query, mode: 'insensitive' },
      },
      take,
      orderBy: { createdAt: 'desc' },
      select: { id: true, content: true, createdAt: true },
    })
  }

  async findAlerts(tenantId: string, query: string, take: number): Promise<AlertSearchRow[]> {
    return this.prisma.alert.findMany({
      where: {
        tenantId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, description: true, createdAt: true },
    })
  }

  async findCases(tenantId: string, query: string, take: number): Promise<CaseSearchRow[]> {
    return this.prisma.case.findMany({
      where: {
        tenantId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, description: true, createdAt: true },
    })
  }

  async findIncidents(tenantId: string, query: string, take: number): Promise<IncidentSearchRow[]> {
    return this.prisma.incident.findMany({
      where: {
        tenantId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, description: true, createdAt: true },
    })
  }
}
