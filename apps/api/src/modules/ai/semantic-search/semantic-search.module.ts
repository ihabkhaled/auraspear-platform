import { Module } from '@nestjs/common'
import { SemanticSearchController } from './semantic-search.controller'
import { SemanticSearchService } from './semantic-search.service'
import { PrismaModule } from '../../../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [SemanticSearchController],
  providers: [SemanticSearchService],
  exports: [SemanticSearchService],
})
export class SemanticSearchModule {}
