import { Injectable } from '@nestjs/common'
import { nowDate } from '../../common/utils/date-time.utility'
import { PrismaService } from '../../prisma/prisma.service'
import type {
  CaseNumberSelect,
  NotificationFindManyParameters,
  NotificationPreferenceSelect,
  UserIdNameEmailSelect,
  UserNameSelect,
} from './notifications.types'
import type { Notification, Prisma } from '@prisma/client'

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyAndCount(
    params: NotificationFindManyParameters
  ): Promise<[Notification[], number]> {
    return Promise.all([
      this.prisma.notification.findMany(params),
      this.prisma.notification.count({ where: params.where }),
    ])
  }

  async countUnread(tenantId: string, recipientUserId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { tenantId, recipientUserId, readAt: null },
    })
  }

  async findFirstByIdAndRecipient(
    notificationId: string,
    tenantId: string,
    recipientUserId: string
  ): Promise<Notification | null> {
    return this.prisma.notification.findFirst({
      where: { id: notificationId, tenantId, recipientUserId },
    })
  }

  async markAsRead(notificationId: string, tenantId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, tenantId },
      data: { readAt: nowDate() },
    })
  }

  async markAllAsRead(tenantId: string, recipientUserId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.notification.updateMany({
      where: { tenantId, recipientUserId, readAt: null },
      data: { readAt: nowDate() },
    })
  }

  async findUserById(userId: string): Promise<UserNameSelect | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })
  }

  async findUsersByIds(userIds: string[]): Promise<UserIdNameEmailSelect[]> {
    return this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    })
  }

  async createNotification(data: Prisma.NotificationUncheckedCreateInput): Promise<Notification> {
    return this.prisma.notification.create({ data })
  }

  async findCaseById(caseId: string, tenantId: string): Promise<CaseNumberSelect | null> {
    return this.prisma.case.findFirst({
      where: { id: caseId, tenantId },
      select: { caseNumber: true },
    })
  }

  async findUserPreference(userId: string): Promise<NotificationPreferenceSelect | null> {
    return this.prisma.userPreference.findUnique({
      where: { userId },
      select: {
        notificationsInApp: true,
        notifyCaseAssignments: true,
        notifyCaseComments: true,
        notifyCaseActivity: true,
        notifyCaseUpdates: true,
        notifyUserManagement: true,
      },
    })
  }
}
