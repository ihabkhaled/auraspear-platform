import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { ReportTemplateWithTenant, ReportWithRelations } from './reports.types'
import type { Prisma, Report, User } from '@prisma/client'

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyReports(params: {
    where: Prisma.ReportWhereInput
    skip: number
    take: number
    orderBy: Prisma.ReportOrderByWithRelationInput
    include?: Prisma.ReportInclude
  }): Promise<ReportWithRelations[]> {
    return this.prisma.report.findMany(params) as Promise<ReportWithRelations[]>
  }

  async countReports(where: Prisma.ReportWhereInput): Promise<number> {
    return this.prisma.report.count({ where })
  }

  async findFirstReport(params: {
    where: Prisma.ReportWhereInput
    include?: Prisma.ReportInclude
  }): Promise<ReportWithRelations | null> {
    return this.prisma.report.findFirst(params) as Promise<ReportWithRelations | null>
  }

  async findReportByIdAndTenant(id: string, tenantId: string): Promise<Report | null> {
    return this.prisma.report.findFirst({
      where: { id, tenantId },
    })
  }

  async createReport(params: {
    data: Prisma.ReportUncheckedCreateInput
    include?: Prisma.ReportInclude
  }): Promise<ReportWithRelations> {
    return this.prisma.report.create(params) as unknown as Promise<ReportWithRelations>
  }

  async updateManyReports(params: {
    where: Prisma.ReportWhereInput
    data: Prisma.ReportUpdateManyMutationInput | Record<string, unknown>
  }): Promise<Prisma.BatchPayload> {
    return this.prisma.report.updateMany(params)
  }

  async updateReportById(
    id: string,
    tenantId: string,
    data: Prisma.ReportUpdateInput
  ): Promise<Report | null> {
    await this.prisma.report.updateMany({
      where: { id, tenantId },
      data: data as Prisma.ReportUncheckedUpdateManyInput,
    })

    return this.prisma.report.findFirst({
      where: { id, tenantId },
    })
  }

  async deleteManyReports(params: {
    where: Prisma.ReportWhereInput
  }): Promise<Prisma.BatchPayload> {
    return this.prisma.report.deleteMany(params)
  }

  async findUserByEmail(email: string): Promise<Pick<User, 'name'> | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { name: true },
    })
  }

  async findUsersByEmails(emails: string[]): Promise<Pick<User, 'email' | 'name'>[]> {
    return this.prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true, name: true },
    })
  }

  async findManyReportTemplates(params: {
    where: Prisma.ReportTemplateWhereInput
    orderBy?:
      | Prisma.ReportTemplateOrderByWithRelationInput
      | Prisma.ReportTemplateOrderByWithRelationInput[]
    take?: number
    include?: Prisma.ReportTemplateInclude
  }): Promise<ReportTemplateWithTenant[]> {
    return this.prisma.reportTemplate.findMany(params) as Promise<ReportTemplateWithTenant[]>
  }

  async countReportTemplates(where: Prisma.ReportTemplateWhereInput): Promise<number> {
    return this.prisma.reportTemplate.count({ where })
  }
}
