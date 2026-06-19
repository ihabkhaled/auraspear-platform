import { Injectable } from '@nestjs/common'
import { SortOrder } from '../../common/enums'
import { PrismaService } from '../../prisma/prisma.service'
import type {
  CreateRunbookInput,
  RunbookSearchParameters,
  UpdateRunbookInput,
} from './knowledge.types'
import type { Runbook } from '@prisma/client'

@Injectable()
export class KnowledgeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByTenant(tenantId: string, params: RunbookSearchParameters): Promise<Runbook[]> {
    const { page, limit, category, sortBy, sortOrder } = params
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { tenantId }
    if (category) {
      where.category = category
    }

    return this.prisma.runbook.findMany({
      where,
      orderBy: { [sortBy ?? 'createdAt']: sortOrder ?? SortOrder.DESC },
      skip,
      take: limit,
    })
  }

  async countByTenant(tenantId: string, category?: string): Promise<number> {
    const where: Record<string, unknown> = { tenantId }
    if (category) {
      where.category = category
    }
    return this.prisma.runbook.count({ where })
  }

  async findById(id: string, tenantId: string): Promise<Runbook | null> {
    return this.prisma.runbook.findFirst({ where: { id, tenantId } })
  }

  async create(input: CreateRunbookInput): Promise<Runbook> {
    return this.prisma.runbook.create({
      data: {
        tenantId: input.tenantId,
        title: input.title,
        content: input.content,
        category: input.category,
        tags: input.tags,
        createdBy: input.createdBy,
      },
    })
  }

  async update(id: string, tenantId: string, input: UpdateRunbookInput): Promise<Runbook> {
    const data: Record<string, unknown> = { updatedBy: input.updatedBy }
    if (input.title !== undefined) {
      data.title = input.title
    }
    if (input.content !== undefined) {
      data.content = input.content
    }
    if (input.category !== undefined) {
      data.category = input.category
    }
    if (input.tags !== undefined) {
      data.tags = input.tags
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.runbook.update({ where: { id }, data }),
      this.prisma.runbook.findFirstOrThrow({ where: { id, tenantId } }),
    ])

    return updated
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.runbook.deleteMany({ where: { id, tenantId } })
  }

  async search(tenantId: string, query: string, limit: number): Promise<Runbook[]> {
    const lowerQuery = `%${query.toLowerCase()}%`

    return this.prisma.$queryRawUnsafe<Runbook[]>(
      `SELECT * FROM runbooks
       WHERE tenant_id = $1::uuid
         AND (LOWER(title) LIKE $2 OR LOWER(content) LIKE $2 OR EXISTS (
           SELECT 1 FROM unnest(tags) AS tag WHERE LOWER(tag) LIKE $2
         ))
       ORDER BY created_at DESC
       LIMIT $3`,
      tenantId,
      lowerQuery,
      limit
    )
  }
}
