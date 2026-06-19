import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { EntityWithAnomalyCount, AnomalyWithEntity } from './ueba.types'
import type { MlModel, Prisma } from '@prisma/client'

@Injectable()
export class UebaRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------------------------------------------------------- */
  /* UEBA ENTITY QUERIES                                                */
  /* ---------------------------------------------------------------- */

  async findManyEntitiesWithCount(params: {
    where: Prisma.UebaEntityWhereInput
    orderBy: Prisma.UebaEntityOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<EntityWithAnomalyCount[]> {
    return this.prisma.uebaEntity.findMany({
      ...params,
      include: { _count: { select: { anomalies: true } } },
    })
  }

  async countEntities(where: Prisma.UebaEntityWhereInput): Promise<number> {
    return this.prisma.uebaEntity.count({ where })
  }

  async findFirstEntityWithCount(params: {
    where: Prisma.UebaEntityWhereInput
  }): Promise<EntityWithAnomalyCount | null> {
    return this.prisma.uebaEntity.findFirst({
      ...params,
      include: { _count: { select: { anomalies: true } } },
    })
  }

  async createEntity(data: Prisma.UebaEntityCreateInput): Promise<EntityWithAnomalyCount> {
    return this.prisma.uebaEntity.create({
      data,
      include: { _count: { select: { anomalies: true } } },
    })
  }

  async updateEntity(params: {
    where: { id: string; tenantId: string }
    data: Prisma.UebaEntityUpdateManyMutationInput
  }): Promise<EntityWithAnomalyCount | null> {
    await this.prisma.uebaEntity.updateMany({
      where: params.where,
      data: params.data,
    })

    return this.prisma.uebaEntity.findFirst({
      where: params.where,
      include: { _count: { select: { anomalies: true } } },
    })
  }

  async deleteEntity(where: { id: string; tenantId: string }): Promise<Prisma.BatchPayload> {
    return this.prisma.uebaEntity.deleteMany({ where })
  }

  /* ---------------------------------------------------------------- */
  /* UEBA ANOMALY QUERIES                                               */
  /* ---------------------------------------------------------------- */

  async findManyAnomaliesWithEntity(params: {
    where: Prisma.UebaAnomalyWhereInput
    orderBy: Prisma.UebaAnomalyOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<AnomalyWithEntity[]> {
    return this.prisma.uebaAnomaly.findMany({
      ...params,
      include: { entity: { select: { entityName: true, entityType: true } } },
    })
  }

  async countAnomalies(where: Prisma.UebaAnomalyWhereInput): Promise<number> {
    return this.prisma.uebaAnomaly.count({ where })
  }

  async findFirstAnomaly(params: {
    where: Prisma.UebaAnomalyWhereInput
  }): Promise<AnomalyWithEntity | null> {
    return this.prisma.uebaAnomaly.findFirst({
      ...params,
      include: { entity: { select: { entityName: true, entityType: true } } },
    })
  }

  async updateAnomaly(params: {
    where: { id: string; tenantId: string }
    data: Prisma.UebaAnomalyUpdateManyMutationInput
  }): Promise<AnomalyWithEntity | null> {
    await this.prisma.uebaAnomaly.updateMany({
      where: params.where,
      data: params.data,
    })

    return this.prisma.uebaAnomaly.findFirst({
      where: params.where,
      include: { entity: { select: { entityName: true, entityType: true } } },
    })
  }

  /* ---------------------------------------------------------------- */
  /* ML MODEL QUERIES                                                   */
  /* ---------------------------------------------------------------- */

  async findManyModels(params: {
    where: Prisma.MlModelWhereInput
    orderBy: Prisma.MlModelOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<MlModel[]> {
    return this.prisma.mlModel.findMany(params)
  }

  async countModels(where: Prisma.MlModelWhereInput): Promise<number> {
    return this.prisma.mlModel.count({ where })
  }
}
