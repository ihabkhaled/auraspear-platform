import { Controller, Post, Body, UseInterceptors, UploadedFile } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { OsintQuerySchema, OsintEnrichSchema } from './dto/osint-query.dto'
import { OsintExecutorService } from './osint-executor.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { OsintQueryDto, OsintEnrichDto } from './dto/osint-query.dto'
import type { OsintEnrichmentResult, OsintQueryResult } from './osint-executor.types'

@ApiTags('osint')
@ApiBearerAuth()
@Controller('osint')
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class OsintExecutorController {
  constructor(private readonly osintExecutorService: OsintExecutorService) {}

  @Post('query')
  @RequirePermission(Permission.AI_CONFIG_MANAGE_OSINT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async querySingleSource(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(OsintQuerySchema)) dto: OsintQueryDto,
    @CurrentUser('email') _actor: string
  ): Promise<OsintQueryResult> {
    return this.osintExecutorService.querySource(tenantId, dto.sourceId, dto.iocType, dto.iocValue)
  }

  @Post('enrich')
  @RequirePermission(Permission.AI_CONFIG_MANAGE_OSINT)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async enrichIoc(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(OsintEnrichSchema)) dto: OsintEnrichDto,
    @CurrentUser('email') _actor: string
  ): Promise<OsintEnrichmentResult> {
    return this.osintExecutorService.enrichIoc(tenantId, dto.iocType, dto.iocValue, dto.sourceIds)
  }

  @Post('upload-file')
  @RequirePermission(Permission.AI_CONFIG_MANAGE_OSINT)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 32 * 1024 * 1024 } }))
  async uploadFileForScan(
    @TenantId() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('sourceId') sourceId: string,
    @CurrentUser('email') _actor: string
  ): Promise<OsintQueryResult> {
    return this.osintExecutorService.uploadFileForScan(tenantId, sourceId, file)
  }

  @Post('fetch-analysis')
  @RequirePermission(Permission.AI_CONFIG_MANAGE_OSINT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async fetchAnalysis(
    @TenantId() tenantId: string,
    @Body('analysisUrl') analysisUrl: string,
    @CurrentUser('email') _actor: string
  ): Promise<unknown> {
    return this.osintExecutorService.fetchAnalysisResults(tenantId, analysisUrl)
  }
}
