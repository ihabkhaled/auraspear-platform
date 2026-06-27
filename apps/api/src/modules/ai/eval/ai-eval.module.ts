import { Module } from '@nestjs/common'
import { AiEvalController } from './ai-eval.controller'
import { AiEvalRepository } from './ai-eval.repository'
import { AiEvalService } from './ai-eval.service'
import { PrismaModule } from '../../../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [AiEvalController],
  providers: [AiEvalRepository, AiEvalService],
  exports: [AiEvalService],
})
export class AiEvalModule {}
