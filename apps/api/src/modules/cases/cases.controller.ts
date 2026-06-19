import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { CasesService } from './cases.service'
import { type AssignCaseDto, AssignCaseSchema } from './dto/assign-case.dto'
import { type CreateArtifactDto, CreateArtifactSchema } from './dto/create-artifact.dto'
import { type CreateCaseDto, CreateCaseSchema } from './dto/create-case.dto'
import { type CreateCommentDto, CreateCommentSchema } from './dto/create-comment.dto'
import { type CreateNoteDto, CreateNoteSchema } from './dto/create-note.dto'
import { type CreateTaskDto, CreateTaskSchema } from './dto/create-task.dto'
import { type LinkAlertDto, LinkAlertSchema } from './dto/link-alert.dto'
import { ListCasesQuerySchema } from './dto/list-cases-query.dto'
import { ListCommentsQuerySchema } from './dto/list-comments-query.dto'
import { ListNotesQuerySchema } from './dto/list-notes-query.dto'
import { SearchMentionableUsersQuerySchema } from './dto/search-mentionable-users-query.dto'
import { type UpdateCaseDto, UpdateCaseSchema } from './dto/update-case.dto'
import { type UpdateCommentDto, UpdateCommentSchema } from './dto/update-comment.dto'
import { type UpdateTaskDto, UpdateTaskSchema } from './dto/update-task.dto'
import { AllowCaseOwner } from '../../common/decorators/allow-case-owner.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type {
  CaseCommentResponse,
  CaseRecord,
  CaseStats,
  MentionableUser,
  PaginatedCaseComments,
  PaginatedCaseNotes,
  PaginatedCases,
} from './cases.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { CaseArtifact, CaseNote, CaseTask } from '@prisma/client'

@Controller('cases')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  @RequirePermission(Permission.CASES_VIEW)
  async listCases(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedCases> {
    const { page, limit, sortBy, sortOrder, status, severity, query, cycleId, ownerUserId } =
      ListCasesQuerySchema.parse(rawQuery)
    return this.casesService.listCases(
      tenantId,
      page,
      limit,
      sortBy,
      sortOrder,
      status,
      severity,
      query,
      cycleId,
      ownerUserId
    )
  }

  @Post()
  @RequirePermission(Permission.CASES_CREATE)
  async createCase(
    @Body(new ZodValidationPipe(CreateCaseSchema)) dto: CreateCaseDto,
    @CurrentUser() user: JwtPayload
  ): Promise<CaseRecord> {
    return this.casesService.createCase(dto, user)
  }

  @Get('stats')
  @RequirePermission(Permission.CASES_VIEW)
  async getCaseStats(@TenantId() tenantId: string): Promise<CaseStats> {
    return this.casesService.getCaseStats(tenantId)
  }

  @Get(':id')
  @RequirePermission(Permission.CASES_VIEW)
  async getCaseById(@Param('id') id: string, @TenantId() tenantId: string): Promise<CaseRecord> {
    return this.casesService.getCaseById(id, tenantId)
  }

  @Patch(':id')
  @RequirePermission(Permission.CASES_UPDATE)
  @AllowCaseOwner()
  async updateCase(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCaseSchema)) dto: UpdateCaseDto,
    @CurrentUser() user: JwtPayload
  ): Promise<CaseRecord> {
    return this.casesService.updateCase(id, dto, user)
  }

  @Patch(':id/assign')
  @RequirePermission(Permission.CASES_ASSIGN)
  @AllowCaseOwner()
  async assignCase(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AssignCaseSchema)) dto: AssignCaseDto,
    @CurrentUser() user: JwtPayload
  ): Promise<CaseRecord> {
    return this.casesService.assignCase(id, dto.ownerUserId, user)
  }

  @Delete(':id')
  @RequirePermission(Permission.CASES_DELETE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteCase(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    return this.casesService.deleteCase(id, tenantId, user.email)
  }

  @Post(':id/link-alert')
  @RequirePermission(Permission.CASES_UPDATE)
  @AllowCaseOwner()
  async linkAlert(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(LinkAlertSchema)) dto: LinkAlertDto,
    @CurrentUser() user: JwtPayload
  ): Promise<CaseRecord> {
    return this.casesService.linkAlert(id, dto, user)
  }

  @Get(':id/notes')
  @RequirePermission(Permission.CASES_VIEW)
  async getCaseNotes(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedCaseNotes> {
    const { page, limit } = ListNotesQuerySchema.parse(rawQuery)
    return this.casesService.getCaseNotes(id, tenantId, page, limit)
  }

  @Post(':id/notes')
  @RequirePermission(Permission.CASES_ADD_COMMENT)
  @AllowCaseOwner()
  async addCaseNote(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateNoteSchema)) dto: CreateNoteDto,
    @CurrentUser() user: JwtPayload
  ): Promise<CaseNote> {
    return this.casesService.addCaseNote(id, dto, user)
  }

  /* ---------------------------------------------------------------- */
  /* COMMENTS                                                           */
  /* ---------------------------------------------------------------- */

  @Get(':id/comments/mentionable-users')
  @RequirePermission(Permission.CASES_VIEW)
  async searchMentionableUsers(
    @Param('id') _id: string,
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<{ data: MentionableUser[] }> {
    const { query, limit } = SearchMentionableUsersQuerySchema.parse(rawQuery)
    const users = await this.casesService.searchMentionableUsers(tenantId, query, limit)
    return { data: users }
  }

  @Get(':id/comments')
  @RequirePermission(Permission.CASES_VIEW)
  async listCaseComments(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedCaseComments> {
    const { page, limit } = ListCommentsQuerySchema.parse(rawQuery)
    return this.casesService.listCaseComments(id, tenantId, page, limit)
  }

  @Post(':id/comments')
  @RequirePermission(Permission.CASES_ADD_COMMENT)
  @AllowCaseOwner()
  async addCaseComment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateCommentSchema)) dto: CreateCommentDto,
    @CurrentUser() user: JwtPayload
  ): Promise<{ data: CaseCommentResponse }> {
    const comment = await this.casesService.addCaseComment(id, dto, user)
    return { data: comment }
  }

  @Patch(':id/comments/:commentId')
  @RequirePermission(Permission.CASES_ADD_COMMENT)
  @AllowCaseOwner()
  async updateCaseComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body(new ZodValidationPipe(UpdateCommentSchema)) dto: UpdateCommentDto,
    @CurrentUser() user: JwtPayload
  ): Promise<{ data: CaseCommentResponse }> {
    const comment = await this.casesService.updateCaseComment(id, commentId, dto, user)
    return { data: comment }
  }

  @Delete(':id/comments/:commentId')
  @RequirePermission(Permission.CASES_DELETE_COMMENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteCaseComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    return this.casesService.deleteCaseComment(id, commentId, user)
  }

  /* ---------------------------------------------------------------- */
  /* TASKS                                                              */
  /* ---------------------------------------------------------------- */

  @Post(':id/tasks')
  @RequirePermission(Permission.CASES_ADD_TASK)
  @AllowCaseOwner()
  async createTask(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateTaskSchema)) dto: CreateTaskDto,
    @CurrentUser() user: JwtPayload
  ): Promise<{ data: CaseTask }> {
    const task = await this.casesService.createTask(id, dto, user)
    return { data: task }
  }

  @Patch(':id/tasks/:taskId')
  @RequirePermission(Permission.CASES_UPDATE_TASK)
  @AllowCaseOwner()
  async updateTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body(new ZodValidationPipe(UpdateTaskSchema)) dto: UpdateTaskDto,
    @CurrentUser() user: JwtPayload
  ): Promise<{ data: CaseTask }> {
    const task = await this.casesService.updateTask(id, taskId, dto, user)
    return { data: task }
  }

  @Delete(':id/tasks/:taskId')
  @RequirePermission(Permission.CASES_DELETE_TASK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    return this.casesService.deleteTask(id, taskId, user)
  }

  /* ---------------------------------------------------------------- */
  /* ARTIFACTS                                                          */
  /* ---------------------------------------------------------------- */

  @Post(':id/artifacts')
  @RequirePermission(Permission.CASES_ADD_ARTIFACT)
  @AllowCaseOwner()
  async createArtifact(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateArtifactSchema)) dto: CreateArtifactDto,
    @CurrentUser() user: JwtPayload
  ): Promise<{ data: CaseArtifact }> {
    const artifact = await this.casesService.createArtifact(id, dto, user)
    return { data: artifact }
  }

  @Delete(':id/artifacts/:artifactId')
  @RequirePermission(Permission.CASES_DELETE_ARTIFACT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteArtifact(
    @Param('id') id: string,
    @Param('artifactId') artifactId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    return this.casesService.deleteArtifact(id, artifactId, user)
  }
}
