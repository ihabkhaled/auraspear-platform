import { Module } from '@nestjs/common'
import { SemanticSearchController } from './semantic-search.controller'
import { SemanticSearchRepository } from './semantic-search.repository'
import { SemanticSearchService } from './semantic-search.service'
import { PrismaModule } from '../../../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [SemanticSearchController],
  providers: [SemanticSearchRepository, SemanticSearchService],
  exports: [SemanticSearchService],
})
export class SemanticSearchModule {}
