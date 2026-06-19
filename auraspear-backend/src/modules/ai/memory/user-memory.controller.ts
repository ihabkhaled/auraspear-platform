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
import { UserMemoryService } from './user-memory.service'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../../common/decorators/permission.decorator'
import { TenantId } from '../../../common/decorators/tenant-id.decorator'
import { Permission } from '../../../common/enums'
import { AuthGuard } from '../../../common/guards/auth.guard'
import { TenantGuard } from '../../../common/guards/tenant.guard'
import type { MemoryStatsResponse, RetentionPolicyRecord, UserMemoryRecord } from './memory.types'
import type { JwtPayload } from '../../../common/interfaces/authenticated-request.interface'

@Controller('user-memory')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class UserMemoryController {
  constructor(private readonly memoryService: UserMemoryService) {}

  @Get()
  @RequirePermission(Permission.AI_MEMORY_VIEW)
  async listMemories(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('limit') rawLimit?: string,
    @Query('offset') rawOffset?: string
  ): Promise<{ data: UserMemoryRecord[]; total: number }> {
    const limit = Math.min(100, Math.max(1, Number.parseInt(rawLimit ?? '50', 10) || 50))
    const offset = Math.max(0, Number.parseInt(rawOffset ?? '0', 10) || 0)
    return this.memoryService.listMemories(tenantId, user.sub, { category, search, limit, offset })
  }

  @Post()
  @RequirePermission(Permission.AI_MEMORY_EDIT)
  async createMemory(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { content: string; category?: string }
  ): Promise<UserMemoryRecord> {
    return this.memoryService.createMemory(tenantId, user.sub, body)
  }

  @Patch(':id')
  @RequirePermission(Permission.AI_MEMORY_EDIT)
  async updateMemory(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) memoryId: string,
    @Body() body: { content: string; category?: string }
  ): Promise<UserMemoryRecord> {
    return this.memoryService.updateMemory(tenantId, user.sub, memoryId, body)
  }

  @Delete(':id')
  @RequirePermission(Permission.AI_MEMORY_EDIT)
  async deleteMemory(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) memoryId: string
  ): Promise<void> {
    return this.memoryService.deleteMemory(tenantId, user.sub, memoryId)
  }

  @Delete()
  @RequirePermission(Permission.AI_MEMORY_EDIT)
  async deleteAllMemories(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: number }> {
    const count = await this.memoryService.deleteAllMemories(tenantId, user.sub)
    return { deleted: count }
  }

  /* ── Governance endpoints ──────────────────────────── */

  @Get('governance/stats')
  @RequirePermission(Permission.AI_MEMORY_ADMIN)
  async getMemoryStats(@TenantId() tenantId: string): Promise<MemoryStatsResponse> {
    return this.memoryService.getMemoryStats(tenantId)
  }

  @Get('governance/all')
  @RequirePermission(Permission.AI_MEMORY_ADMIN)
  async listAllMemories(
    @TenantId() tenantId: string,
    @Query('userId') userId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('limit') rawLimit?: string,
    @Query('offset') rawOffset?: string
  ): Promise<{ data: UserMemoryRecord[]; total: number }> {
    const limit = Math.min(100, Math.max(1, Number.parseInt(rawLimit ?? '50', 10) || 50))
    const offset = Math.max(0, Number.parseInt(rawOffset ?? '0', 10) || 0)
    return this.memoryService.listAllMemories(tenantId, { userId, category, search, limit, offset })
  }

  @Get('governance/export')
  @RequirePermission(Permission.AI_MEMORY_EXPORT)
  async exportMemories(
    @TenantId() tenantId: string,
    @Query('userId') userId?: string
  ): Promise<{ data: UserMemoryRecord[] }> {
    const data = await this.memoryService.exportMemories(tenantId, userId)
    return { data }
  }

  @Get('governance/retention')
  @RequirePermission(Permission.AI_MEMORY_ADMIN)
  async getRetentionPolicy(@TenantId() tenantId: string): Promise<RetentionPolicyRecord | null> {
    return this.memoryService.getRetentionPolicy(tenantId)
  }

  @Patch('governance/retention')
  @RequirePermission(Permission.AI_MEMORY_ADMIN)
  async upsertRetentionPolicy(
    @TenantId() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { retentionDays: number; autoCleanup: boolean }
  ): Promise<RetentionPolicyRecord> {
    return this.memoryService.upsertRetentionPolicy(tenantId, body, userId)
  }

  @Post('governance/cleanup')
  @RequirePermission(Permission.AI_MEMORY_ADMIN)
  async runCleanup(@TenantId() tenantId: string): Promise<{ cleaned: number }> {
    const cleaned = await this.memoryService.cleanupExpiredMemories(tenantId)
    return { cleaned }
  }

  @Delete('governance/user/:userId')
  @RequirePermission(Permission.AI_MEMORY_ADMIN)
  async adminDeleteUserMemories(
    @TenantId() tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string
  ): Promise<{ deleted: number }> {
    const count = await this.memoryService.adminDeleteUserMemories(tenantId, userId)
    return { deleted: count }
  }
}
