import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { DashboardDensity, DashboardPanelKey, Prisma } from '@prisma/client'

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdWithPreferencesAndMemberships(
    userId: string,
    tenantId?: string
  ): Promise<Prisma.UserGetPayload<{
    include: {
      preference: true
      memberships: { include: { tenant: true } }
    }
  }> | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preference: true,
        memberships: tenantId
          ? { where: { tenantId }, include: { tenant: true }, take: 1 }
          : { include: { tenant: true }, take: 1 },
      },
    })
  }

  async findById(userId: string): Promise<Prisma.UserGetPayload<Record<string, never>> | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    })
  }

  async findByIdWithMembership(
    userId: string,
    tenantId: string
  ): Promise<Prisma.UserGetPayload<{
    include: { memberships: true }
  }> | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { tenantId },
          take: 1,
        },
      },
    })
  }

  async updateName(
    userId: string,
    name: string
  ): Promise<
    Prisma.UserGetPayload<{
      include: {
        preference: true
        memberships: { include: { tenant: true } }
      }
    }>
  > {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name },
      include: {
        preference: true,
        memberships: { include: { tenant: true }, take: 1 },
      },
    })
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })
  }

  async findPreference(
    userId: string
  ): Promise<Prisma.UserPreferenceGetPayload<Record<string, never>> | null> {
    return this.prisma.userPreference.findUnique({
      where: { userId },
    })
  }

  async upsertPreference(
    userId: string,
    updateData: {
      theme?: string
      language?: string
      dashboardDensity?: DashboardDensity
      collapsedDashboardPanels?: DashboardPanelKey[]
      notificationsEmail?: boolean
      notificationsInApp?: boolean
      notifyCriticalAlerts?: boolean
      notifyHighAlerts?: boolean
      notifyCaseAssignments?: boolean
      notifyIncidentUpdates?: boolean
      notifyComplianceAlerts?: boolean
      notifyCaseUpdates?: boolean
      notifyCaseComments?: boolean
      notifyCaseActivity?: boolean
      notifyUserManagement?: boolean
      retentionAlerts?: string
      retentionLogs?: string
      retentionIncidents?: string
      retentionAuditLogs?: string
    },
    createData: {
      theme: string
      language: string
      dashboardDensity: DashboardDensity
      collapsedDashboardPanels: DashboardPanelKey[]
      notificationsEmail: boolean
      notificationsInApp: boolean
      notifyCriticalAlerts: boolean
      notifyHighAlerts: boolean
      notifyCaseAssignments: boolean
      notifyIncidentUpdates: boolean
      notifyComplianceAlerts: boolean
      notifyCaseUpdates: boolean
      notifyCaseComments: boolean
      notifyCaseActivity: boolean
      notifyUserManagement: boolean
      retentionAlerts: string
      retentionLogs: string
      retentionIncidents: string
      retentionAuditLogs: string
    }
  ): Promise<Prisma.UserPreferenceGetPayload<Record<string, never>>> {
    return this.prisma.userPreference.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...createData },
    })
  }
}
