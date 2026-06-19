import { Module } from '@nestjs/common'
import { FeatureCatalogController } from './feature-catalog.controller'
import { FeatureCatalogRepository } from './feature-catalog.repository'
import { FeatureCatalogService } from './feature-catalog.service'
import { AppLogsModule } from '../../app-logs/app-logs.module'

@Module({
  imports: [AppLogsModule],
  controllers: [FeatureCatalogController],
  providers: [FeatureCatalogRepository, FeatureCatalogService],
  exports: [FeatureCatalogService],
})
export class FeatureCatalogModule {}
