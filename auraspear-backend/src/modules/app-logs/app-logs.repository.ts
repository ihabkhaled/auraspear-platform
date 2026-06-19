import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { ApplicationLog, Prisma } from '@prisma/client'

@Injectable()
export class AppLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyAndCount(params: {
    where: Prisma.ApplicationLogWhereInput
    orderBy: Prisma.ApplicationLogOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<[ApplicationLog[], number]> {
    return Promise.all([
      this.prisma.applicationLog.findMany(params),
      this.prisma.applicationLog.count({ where: params.where }),
    ])
  }

  async findById(id: string): Promise<ApplicationLog | null> {
    return this.prisma.applicationLog.findUnique({ where: { id } })
  }
}
