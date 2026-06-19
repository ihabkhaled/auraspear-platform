import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AiChatService } from './ai-chat.service'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../../common/decorators/permission.decorator'
import { TenantId } from '../../../common/decorators/tenant-id.decorator'
import { Permission } from '../../../common/enums'
import { AuthGuard } from '../../../common/guards/auth.guard'
import { TenantGuard } from '../../../common/guards/tenant.guard'
import type { JwtPayload } from '../../../common/interfaces/authenticated-request.interface'
import type { AiChatMessage, AiChatThread } from '@prisma/client'

@Controller('ai-chat')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class AiChatController {
  constructor(private readonly chatService: AiChatService) {}

  /** GET /ai-chat/threads — List user's chat threads with cursor pagination */
  @Get('threads')
  @RequirePermission(Permission.AI_CHAT_ACCESS)
  async listThreads(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('limit') rawLimit?: string,
    @Query('cursor') cursor?: string
  ): Promise<{ data: AiChatThread[]; nextCursor: string | null; hasMore: boolean }> {
    const limit = Math.min(50, Math.max(1, Number.parseInt(rawLimit ?? '20', 10) || 20))
    return this.chatService.listThreads(tenantId, user.sub, limit, cursor)
  }

  /** POST /ai-chat/threads — Create a new chat thread */
  @Post('threads')
  @RequirePermission(Permission.AI_CHAT_ACCESS)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createThread(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { connectorId?: string; model?: string; systemPrompt?: string }
  ): Promise<AiChatThread> {
    return this.chatService.createThread(tenantId, user.sub, body)
  }

  /** GET /ai-chat/threads/:id/messages — Get cursor-paginated messages for a thread */
  @Get('threads/:id/messages')
  @RequirePermission(Permission.AI_CHAT_ACCESS)
  async getMessages(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) threadId: string,
    @Query('limit') rawLimit?: string,
    @Query('cursor') cursor?: string,
    @Query('direction') direction?: string
  ): Promise<{ data: AiChatMessage[]; nextCursor: string | null; hasMore: boolean }> {
    const limit = Math.min(50, Math.max(1, Number.parseInt(rawLimit ?? '30', 10) || 30))
    const dir = direction === 'newer' ? 'newer' : 'older'
    return this.chatService.getMessages(tenantId, user.sub, threadId, limit, cursor, dir)
  }

  /** POST /ai-chat/threads/:id/messages — Send a message and get AI response */
  @Post('threads/:id/messages')
  @RequirePermission(Permission.AI_CHAT_ACCESS)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async sendMessage(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) threadId: string,
    @Body() body: { content: string; model?: string; connectorId?: string }
  ): Promise<AiChatMessage> {
    return this.chatService.sendMessage(tenantId, user.sub, threadId, body.content, {
      model: body.model,
      connectorId: body.connectorId,
    })
  }

  /** PATCH /ai-chat/threads/:id — Update thread settings (model, connector) */
  @Patch('threads/:id')
  @RequirePermission(Permission.AI_CHAT_ACCESS)
  async updateThread(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) threadId: string,
    @Body() body: { connectorId?: string; model?: string }
  ): Promise<AiChatThread> {
    return this.chatService.updateThreadSettings(tenantId, user.sub, threadId, body)
  }

  /** DELETE /ai-chat/threads/:id — Archive a chat thread */
  @Delete('threads/:id')
  @RequirePermission(Permission.AI_CHAT_ACCESS)
  async archiveThread(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) threadId: string
  ): Promise<void> {
    return this.chatService.archiveThread(tenantId, user.sub, threadId)
  }
}
