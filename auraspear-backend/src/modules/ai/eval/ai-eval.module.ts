import { Module } from '@nestjs/common'
import { AiEvalController } from './ai-eval.controller'
import { AiEvalService } from './ai-eval.service'
import { PrismaModule } from '../../../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [AiEvalController],
  providers: [AiEvalService],
  exports: [AiEvalService],
})
export class AiEvalModule {}
