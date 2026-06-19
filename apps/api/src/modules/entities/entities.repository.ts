import { Injectable } from '@nestjs/common'
import { nowDate } from '../../common/utils/date-time.utility'
import { PrismaService } from '../../prisma/prisma.service'
import type { EntityRecord, EntityRelationRecord } from './entities.types'
import type { Prisma } from '@prisma/client'

@Injectable()
export class EntitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyAndCount(params: {
    where: Prisma.EntityWhereInput
    orderBy: Prisma.EntityOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<[EntityRecord[], number]> {
    return Promise.all([
      this.prisma.entity.findMany(params),
      this.prisma.entity.count({ where: params.where }),
    ])
  }

  async findFirstByIdAndTenant(id: string, tenantId: string): Promise<EntityRecord | null> {
    return this.prisma.entity.findFirst({
      where: { id, tenantId },
    })
  }

  async findByTypeAndValue(
    tenantId: string,
    type: string,
    value: string
  ): Promise<EntityRecord | null> {
    return this.prisma.entity.findUnique({
      where: { tenantId_type_value: { tenantId, type, value } },
    })
  }

  async create(data: Prisma.EntityCreateInput): Promise<EntityRecord> {
    return this.prisma.entity.create({ data })
  }

  async updateByIdAndTenant(
    id: string,
    tenantId: string,
    data: Prisma.EntityUpdateInput
  ): Promise<EntityRecord | null> {
    await this.prisma.entity.updateMany({
      where: { id, tenantId },
      data: data as Prisma.EntityUncheckedUpdateManyInput,
    })

    return this.prisma.entity.findFirst({
      where: { id, tenantId },
    })
  }

  async createRelation(data: Prisma.EntityRelationCreateInput): Promise<EntityRelationRecord> {
    return this.prisma.entityRelation.create({ data })
  }

  async findRelationsForEntity(
    entityId: string,
    tenantId: string
  ): Promise<EntityRelationRecord[]> {
    return this.prisma.entityRelation.findMany({
      where: {
        tenantId,
        OR: [{ fromEntityId: entityId }, { toEntityId: entityId }],
      },
    })
  }

  async findConnectedEntities(entityIds: string[], tenantId: string): Promise<EntityRecord[]> {
    return this.prisma.entity.findMany({
      where: {
        tenantId,
        id: { in: entityIds },
      },
    })
  }

  async findTopRisky(tenantId: string, limit: number): Promise<EntityRecord[]> {
    return this.prisma.entity.findMany({
      where: { tenantId, riskScore: { gt: 0 } },
      orderBy: { riskScore: 'desc' },
      take: limit,
    })
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.prisma.entity.count({ where: { tenantId } })
  }

  async updateRiskScore(id: string, tenantId: string, riskScore: number): Promise<void> {
    await this.prisma.entity.updateMany({
      where: { id, tenantId },
      data: { riskScore },
    })
  }

  async findAllByTenant(tenantId: string): Promise<EntityRecord[]> {
    return this.prisma.entity.findMany({ where: { tenantId } })
  }

  async upsertByTypeAndValue(
    tenantId: string,
    type: string,
    value: string,
    data: { displayName?: string; lastSeen?: Date }
  ): Promise<EntityRecord> {
    const lastSeen = data.lastSeen ?? nowDate()
    return this.prisma.entity.upsert({
      where: { tenantId_type_value: { tenantId, type, value } },
      create: {
        tenantId,
        type,
        value,
        displayName: data.displayName,
        lastSeen,
      },
      update: {
        lastSeen,
        ...(data.displayName ? { displayName: data.displayName } : {}),
      },
    })
  }
}
