import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { AuditLog, Prisma } from '@prisma/client'

@Injectable()
export class AuditLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    where: Prisma.AuditLogWhereInput
    orderBy: Prisma.AuditLogOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany(params)
  }

  async count(where: Prisma.AuditLogWhereInput): Promise<number> {
    return this.prisma.auditLog.count({ where })
  }

  async findManyAndCount(params: {
    where: Prisma.AuditLogWhereInput
    orderBy: Prisma.AuditLogOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<[AuditLog[], number]> {
    return Promise.all([
      this.prisma.auditLog.findMany(params),
      this.prisma.auditLog.count({ where: params.where }),
    ])
  }

  async create(data: Prisma.AuditLogUncheckedCreateInput): Promise<AuditLog> {
    return this.prisma.auditLog.create({ data })
  }
}
