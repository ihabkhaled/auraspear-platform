import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { SemanticSearchService } from './semantic-search.service'
import { RequirePermission } from '../../../common/decorators/permission.decorator'
import { TenantId } from '../../../common/decorators/tenant-id.decorator'
import { Permission } from '../../../common/enums'
import { AuthGuard } from '../../../common/guards/auth.guard'
import { TenantGuard } from '../../../common/guards/tenant.guard'
import type { SearchResult } from './semantic-search.service'

@Controller('ai-search')
@UseGuards(AuthGuard, TenantGuard)
export class SemanticSearchController {
  constructor(private readonly semanticSearchService: SemanticSearchService) {}

  @Get()
  @RequirePermission(Permission.AI_OPS_VIEW)
  async search(
    @TenantId() tenantId: string,
    @Query('query') query: string,
    @Query('modules') modules?: string,
    @Query('limit') limit?: string
  ): Promise<SearchResult[]> {
    const moduleList = modules ? modules.split(',').filter(Boolean) : undefined
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 25
    return this.semanticSearchService.search(
      tenantId,
      query ?? '',
      moduleList,
      Number.isNaN(parsedLimit) ? 25 : parsedLimit
    )
  }

  @Get('modules')
  @RequirePermission(Permission.AI_OPS_VIEW)
  getSearchableModules(): Array<{ key: string; label: string }> {
    return this.semanticSearchService.getSearchableModules()
  }
}
