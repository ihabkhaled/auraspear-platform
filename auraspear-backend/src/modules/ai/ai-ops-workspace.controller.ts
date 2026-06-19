import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AiOpsWorkspaceService } from './ai-ops-workspace.service'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import type { AiOpsWorkspace } from './ai-ops-workspace.service'

@ApiTags('ai-ops')
@ApiBearerAuth()
@Controller('ai-ops')
@UseGuards(AuthGuard, TenantGuard)
export class AiOpsWorkspaceController {
  constructor(private readonly workspaceService: AiOpsWorkspaceService) {}

  @Get('workspace')
  @RequirePermission(Permission.AI_OPS_VIEW)
  async getWorkspace(@TenantId() tenantId: string): Promise<AiOpsWorkspace> {
    return this.workspaceService.getWorkspace(tenantId)
  }
}
