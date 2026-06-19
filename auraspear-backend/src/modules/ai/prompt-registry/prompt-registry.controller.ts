import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { CreatePromptSchema } from './dto/create-prompt.dto'
import { UpdatePromptSchema } from './dto/update-prompt.dto'
import { PromptRegistryService } from './prompt-registry.service'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../../common/decorators/permission.decorator'
import { Permission } from '../../../common/enums'
import { AuthGuard } from '../../../common/guards/auth.guard'
import { TenantGuard } from '../../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import type { CreatePromptDto } from './dto/create-prompt.dto'
import type { UpdatePromptDto } from './dto/update-prompt.dto'
import type { PromptTemplateResponse } from './prompt-registry.types'
import type { JwtPayload } from '../../../common/interfaces/authenticated-request.interface'

@Controller('ai-prompts')
@UseGuards(AuthGuard, TenantGuard)
export class PromptRegistryController {
  constructor(private readonly promptRegistryService: PromptRegistryService) {}

  /** GET /ai-prompts — List all prompt templates for the tenant */
  @Get()
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async list(@CurrentUser() user: JwtPayload): Promise<PromptTemplateResponse[]> {
    return this.promptRegistryService.list(user.tenantId)
  }

  /** GET /ai-prompts/:id — Get a single prompt template */
  @Get(':id')
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async getById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<PromptTemplateResponse> {
    return this.promptRegistryService.getById(id, user.tenantId)
  }

  /** POST /ai-prompts — Create a new prompt template */
  @Post()
  @RequirePermission(Permission.AI_AGENTS_CREATE)
  async create(
    @Body(new ZodValidationPipe(CreatePromptSchema)) dto: CreatePromptDto,
    @CurrentUser() user: JwtPayload
  ): Promise<PromptTemplateResponse> {
    return this.promptRegistryService.create(user.tenantId, dto, user.email)
  }

  /** PATCH /ai-prompts/:id — Update an existing prompt template */
  @Patch(':id')
  @RequirePermission(Permission.AI_AGENTS_UPDATE)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePromptSchema)) dto: UpdatePromptDto,
    @CurrentUser() user: JwtPayload
  ): Promise<PromptTemplateResponse> {
    return this.promptRegistryService.update(id, user.tenantId, dto, user.email)
  }

  /** POST /ai-prompts/:id/activate — Activate a prompt template (deactivates others for same taskType) */
  @Post(':id/activate')
  @RequirePermission(Permission.AI_AGENTS_UPDATE)
  async activate(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<PromptTemplateResponse> {
    return this.promptRegistryService.activate(id, user.tenantId, user.email)
  }

  /** DELETE /ai-prompts/:id — Delete a prompt template */
  @Delete(':id')
  @RequirePermission(Permission.AI_AGENTS_DELETE)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ success: boolean }> {
    await this.promptRegistryService.delete(id, user.tenantId, user.email)
    return { success: true }
  }
}
