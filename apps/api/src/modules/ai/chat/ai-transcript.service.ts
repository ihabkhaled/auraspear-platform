import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import type { AiAuditLog, AiChatMessage, AiChatThread } from '@prisma/client'

export interface TranscriptStats {
  totalThreads: number
  totalMessages: number
  totalAuditLogs: number
  threadsOnHold: number
  threadsRedacted: number
}

export interface TranscriptPolicyRecord {
  id: string
  tenantId: string
  chatRetentionDays: number
  auditRetentionDays: number
  autoRedactPii: boolean
  requireLegalHold: boolean
  lastCleanupAt: Date | null
  lastCleanupCount: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class AiTranscriptService {
  private readonly logger = new Logger(AiTranscriptService.name)

  constructor(private readonly prisma: PrismaService) {}

  /* ── Stats ─────────────────────────────────────────── */

  async getStats(tenantId: string): Promise<TranscriptStats> {
    const [totalThreads, totalMessages, totalAuditLogs, threadsOnHold, threadsRedacted] =
      await Promise.all([
        this.prisma.aiChatThread.count({ where: { tenantId } }),
        this.prisma.aiChatMessage.count({ where: { tenantId } }),
        this.prisma.aiAuditLog.count({ where: { tenantId } }),
        this.prisma.aiChatThread.count({ where: { tenantId, legalHold: true } }),
        this.prisma.aiChatThread.count({
          where: { tenantId, redactedAt: { not: null } },
        }),
      ])

    return { totalThreads, totalMessages, totalAuditLogs, threadsOnHold, threadsRedacted }
  }

  /* ── Thread listing (admin view) ───────────────────── */

  async listThreads(
    tenantId: string,
    options?: {
      userId?: string
      legalHold?: boolean
      search?: string
      limit?: number
      offset?: number
    }
  ): Promise<{ data: AiChatThread[]; total: number }> {
    const where: Record<string, unknown> = { tenantId }

    if (options?.userId) {
      where['userId'] = options.userId
    }
    if (options?.legalHold !== undefined) {
      where['legalHold'] = options.legalHold
    }
    if (options?.search) {
      where['title'] = { contains: options.search, mode: 'insensitive' }
    }

    const [data, total] = await Promise.all([
      this.prisma.aiChatThread.findMany({
        where,
        include: { user: { select: { email: true } } },
        orderBy: { lastActivityAt: 'desc' },
        take: options?.limit ?? 25,
        skip: options?.offset ?? 0,
      }),
      this.prisma.aiChatThread.count({ where }),
    ])

    return { data, total }
  }

  /* ── Thread messages (for transcript view) ─────────── */

  async getThreadMessages(
    tenantId: string,
    threadId: string
  ): Promise<AiChatMessage[]> {
    return this.prisma.aiChatMessage.findMany({
      where: { tenantId, threadId },
      orderBy: { sequenceNum: 'asc' },
    })
  }

  /* ── AI Audit logs listing ─────────────────────────── */

  async listAuditLogs(
    tenantId: string,
    options?: {
      actor?: string
      action?: string
      from?: string
      to?: string
      limit?: number
      offset?: number
    }
  ): Promise<{ data: AiAuditLog[]; total: number }> {
    const where: Record<string, unknown> = { tenantId }

    if (options?.actor) {
      where['actor'] = { contains: options.actor, mode: 'insensitive' }
    }
    if (options?.action) {
      where['action'] = options.action
    }
    if (options?.from || options?.to) {
      const dateFilter: Record<string, Date> = {}
      if (options?.from) dateFilter['gte'] = new Date(options.from)
      if (options?.to) dateFilter['lte'] = new Date(options.to)
      where['createdAt'] = dateFilter
    }

    const [data, total] = await Promise.all([
      this.prisma.aiAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 25,
        skip: options?.offset ?? 0,
      }),
      this.prisma.aiAuditLog.count({ where }),
    ])

    return { data, total }
  }

  /* ── Legal hold ────────────────────────────────────── */

  async toggleLegalHold(
    tenantId: string,
    threadId: string,
    legalHold: boolean
  ): Promise<AiChatThread> {
    const thread = await this.prisma.aiChatThread.findFirst({
      where: { id: threadId, tenantId },
    })
    if (!thread) {
      throw new Error('Thread not found')
    }

    return this.prisma.aiChatThread.update({
      where: { id: threadId },
      data: { legalHold },
    })
  }

  /* ── Redaction ─────────────────────────────────────── */

  async redactThread(tenantId: string, threadId: string): Promise<number> {
    const thread = await this.prisma.aiChatThread.findFirst({
      where: { id: threadId, tenantId },
    })
    if (!thread) {
      throw new Error('Thread not found')
    }
    if (thread.legalHold) {
      throw new Error('Cannot redact a thread under legal hold')
    }

    const result = await this.prisma.aiChatMessage.updateMany({
      where: { threadId, tenantId },
      data: { content: '[REDACTED]' },
    })

    await this.prisma.aiChatThread.update({
      where: { id: threadId },
      data: { redactedAt: new Date(), complianceStatus: 'redacted' },
    })

    this.logger.log(`Redacted ${String(result.count)} messages in thread ${threadId}`)
    return result.count
  }

  /* ── Export ────────────────────────────────────────── */

  async exportThreadTranscript(
    tenantId: string,
    threadId: string
  ): Promise<{ thread: AiChatThread; messages: AiChatMessage[] }> {
    const thread = await this.prisma.aiChatThread.findFirst({
      where: { id: threadId, tenantId },
    })
    if (!thread) {
      throw new Error('Thread not found')
    }

    const messages = await this.prisma.aiChatMessage.findMany({
      where: { threadId, tenantId },
      orderBy: { sequenceNum: 'asc' },
    })

    return { thread, messages }
  }

  async exportAuditLogs(
    tenantId: string,
    from?: string,
    to?: string
  ): Promise<AiAuditLog[]> {
    const where: Record<string, unknown> = { tenantId }
    if (from || to) {
      const dateFilter: Record<string, Date> = {}
      if (from) dateFilter['gte'] = new Date(from)
      if (to) dateFilter['lte'] = new Date(to)
      where['createdAt'] = dateFilter
    }

    return this.prisma.aiAuditLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })
  }

  /* ── Transcript policy ─────────────────────────────── */

  async getPolicy(tenantId: string): Promise<TranscriptPolicyRecord | null> {
    return this.prisma.aiTranscriptPolicy.findUnique({ where: { tenantId } })
  }

  async upsertPolicy(
    tenantId: string,
    data: {
      chatRetentionDays: number
      auditRetentionDays: number
      autoRedactPii: boolean
      requireLegalHold: boolean
    },
    createdBy: string
  ): Promise<TranscriptPolicyRecord> {
    return this.prisma.aiTranscriptPolicy.upsert({
      where: { tenantId },
      update: data,
      create: { tenantId, ...data, createdBy },
    })
  }

  /* ── Retention cleanup ─────────────────────────────── */

  async cleanupExpiredTranscripts(tenantId: string): Promise<{ chats: number; audits: number }> {
    const policy = await this.getPolicy(tenantId)
    if (!policy) return { chats: 0, audits: 0 }

    let chats = 0
    let audits = 0

    if (policy.chatRetentionDays > 0) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - policy.chatRetentionDays)

      // Only delete threads NOT on legal hold
      const threads = await this.prisma.aiChatThread.findMany({
        where: {
          tenantId,
          legalHold: false,
          isArchived: false,
          lastActivityAt: { lt: cutoff },
        },
        select: { id: true },
      })

      if (threads.length > 0) {
        const threadIds = threads.map(t => t.id)
        await this.prisma.aiChatMessage.deleteMany({
          where: { threadId: { in: threadIds } },
        })
        const result = await this.prisma.aiChatThread.deleteMany({
          where: { id: { in: threadIds } },
        })
        chats = result.count
      }
    }

    if (policy.auditRetentionDays > 0) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - policy.auditRetentionDays)

      const result = await this.prisma.aiAuditLog.deleteMany({
        where: { tenantId, createdAt: { lt: cutoff } },
      })
      audits = result.count
    }

    if (chats > 0 || audits > 0) {
      await this.prisma.aiTranscriptPolicy.update({
        where: { tenantId },
        data: { lastCleanupAt: new Date(), lastCleanupCount: chats + audits },
      })
      this.logger.log(`Transcript cleanup: deleted ${String(chats)} threads, ${String(audits)} audit logs for tenant ${tenantId}`)
    }

    return { chats, audits }
  }
}
