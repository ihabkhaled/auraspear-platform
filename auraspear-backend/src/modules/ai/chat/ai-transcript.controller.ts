import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AiTranscriptService } from './ai-transcript.service'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../../common/decorators/permission.decorator'
import { TenantId } from '../../../common/decorators/tenant-id.decorator'
import { Permission } from '../../../common/enums'
import { AuthGuard } from '../../../common/guards/auth.guard'
import { TenantGuard } from '../../../common/guards/tenant.guard'
import type { TranscriptPolicyRecord, TranscriptStats } from './ai-transcript.service'
import type { AiAuditLog, AiChatMessage, AiChatThread } from '@prisma/client'

@ApiTags('ai-transcripts')
@ApiBearerAuth()
@Controller('ai-transcripts')
@UseGuards(AuthGuard, TenantGuard)
export class AiTranscriptController {
  constructor(private readonly transcriptService: AiTranscriptService) {}

  @Get('stats')
  @RequirePermission(Permission.AI_TRANSCRIPT_VIEW)
  async getStats(@TenantId() tenantId: string): Promise<TranscriptStats> {
    return this.transcriptService.getStats(tenantId)
  }

  @Get('threads')
  @RequirePermission(Permission.AI_TRANSCRIPT_VIEW)
  async listThreads(
    @TenantId() tenantId: string,
    @Query('userId') userId?: string,
    @Query('legalHold') legalHold?: string,
    @Query('search') search?: string,
    @Query('limit') rawLimit?: string,
    @Query('offset') rawOffset?: string
  ): Promise<{ data: AiChatThread[]; total: number }> {
    const limit = Math.min(100, Math.max(1, Number.parseInt(rawLimit ?? '25', 10) || 25))
    const offset = Math.max(0, Number.parseInt(rawOffset ?? '0', 10) || 0)
    const holdFilter = legalHold === 'true' ? true : legalHold === 'false' ? false : undefined
    return this.transcriptService.listThreads(tenantId, { userId, legalHold: holdFilter, search, limit, offset })
  }

  @Get('threads/:id/messages')
  @RequirePermission(Permission.AI_TRANSCRIPT_VIEW)
  async getThreadMessages(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) threadId: string
  ): Promise<AiChatMessage[]> {
    return this.transcriptService.getThreadMessages(tenantId, threadId)
  }

  @Get('audit-logs')
  @RequirePermission(Permission.AI_TRANSCRIPT_VIEW)
  async listAuditLogs(
    @TenantId() tenantId: string,
    @Query('actor') actor?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') rawLimit?: string,
    @Query('offset') rawOffset?: string
  ): Promise<{ data: AiAuditLog[]; total: number }> {
    const limit = Math.min(100, Math.max(1, Number.parseInt(rawLimit ?? '25', 10) || 25))
    const offset = Math.max(0, Number.parseInt(rawOffset ?? '0', 10) || 0)
    return this.transcriptService.listAuditLogs(tenantId, { actor, action, from, to, limit, offset })
  }

  @Post('threads/:id/legal-hold')
  @RequirePermission(Permission.AI_TRANSCRIPT_MANAGE)
  async toggleLegalHold(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) threadId: string,
    @Body() body: { legalHold: boolean }
  ): Promise<AiChatThread> {
    return this.transcriptService.toggleLegalHold(tenantId, threadId, body.legalHold)
  }

  @Post('threads/:id/redact')
  @RequirePermission(Permission.AI_TRANSCRIPT_MANAGE)
  async redactThread(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) threadId: string
  ): Promise<{ redacted: number }> {
    const count = await this.transcriptService.redactThread(tenantId, threadId)
    return { redacted: count }
  }

  @Get('export/thread/:id')
  @RequirePermission(Permission.AI_TRANSCRIPT_EXPORT)
  async exportThread(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) threadId: string
  ): Promise<{ thread: AiChatThread; messages: AiChatMessage[] }> {
    return this.transcriptService.exportThreadTranscript(tenantId, threadId)
  }

  @Get('export/audit-logs')
  @RequirePermission(Permission.AI_TRANSCRIPT_EXPORT)
  async exportAuditLogs(
    @TenantId() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ): Promise<AiAuditLog[]> {
    return this.transcriptService.exportAuditLogs(tenantId, from, to)
  }

  @Get('policy')
  @RequirePermission(Permission.AI_TRANSCRIPT_VIEW)
  async getPolicy(@TenantId() tenantId: string): Promise<TranscriptPolicyRecord | null> {
    return this.transcriptService.getPolicy(tenantId)
  }

  @Patch('policy')
  @RequirePermission(Permission.AI_TRANSCRIPT_MANAGE)
  async upsertPolicy(
    @TenantId() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: {
      chatRetentionDays: number
      auditRetentionDays: number
      autoRedactPii: boolean
      requireLegalHold: boolean
    }
  ): Promise<TranscriptPolicyRecord> {
    return this.transcriptService.upsertPolicy(tenantId, body, userId)
  }

  @Post('cleanup')
  @RequirePermission(Permission.AI_TRANSCRIPT_MANAGE)
  async runCleanup(
    @TenantId() tenantId: string
  ): Promise<{ chats: number; audits: number }> {
    return this.transcriptService.cleanupExpiredTranscripts(tenantId)
  }
}
