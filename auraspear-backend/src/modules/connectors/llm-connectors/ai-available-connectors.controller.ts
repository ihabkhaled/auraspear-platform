import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { FIXED_AI_CONNECTORS } from './llm-connectors.constants'
import { LlmConnectorsService } from './llm-connectors.service'
import { RequirePermission } from '../../../common/decorators/permission.decorator'
import { TenantId } from '../../../common/decorators/tenant-id.decorator'
import { Permission } from '../../../common/enums'
import { ConnectorsService } from '../connectors.service'
import type { AiAvailableConnector } from './llm-connectors.types'

@ApiTags('connectors')
@ApiBearerAuth()
@Controller('ai-connectors')
export class AiAvailableConnectorsController {
  constructor(
    private readonly connectorsService: ConnectorsService,
    private readonly llmConnectorsService: LlmConnectorsService
  ) {}

  @Get('ai-available')
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async getAiAvailable(@TenantId() tenantId: string): Promise<AiAvailableConnector[]> {
    const result: AiAvailableConnector[] = [
      { key: 'default', label: 'Default (Auto)', type: 'system', enabled: true },
    ]

    // Check fixed AI connector statuses
    const fixedChecks = await Promise.all(
      FIXED_AI_CONNECTORS.map(async ({ type, label }) => {
        const enabled = await this.connectorsService.isEnabled(tenantId, type)
        return { key: type, label, type: 'fixed' as const, enabled }
      })
    )
    result.push(...fixedChecks)

    // Get dynamic LLM connectors
    const dynamicConnectors = await this.llmConnectorsService.getEnabledSummariesSafe(tenantId)
    for (const dynamic of dynamicConnectors) {
      result.push({
        key: dynamic.id,
        label: dynamic.name,
        type: 'dynamic',
        enabled: dynamic.enabled,
      })
    }

    return result
  }
}
