import { Module } from '@nestjs/common'
import { AiSimulationController } from './ai-simulation.controller'
import { AiSimulationService } from './ai-simulation.service'
import { PrismaModule } from '../../../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [AiSimulationController],
  providers: [AiSimulationService],
  exports: [AiSimulationService],
})
export class AiSimulationModule {}
