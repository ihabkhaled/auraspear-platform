import { forwardRef, Module } from '@nestjs/common'
import { AiUebaController } from './ai-ueba.controller'
import { AiUebaService } from './ai-ueba.service'
import { UebaController } from './ueba.controller'
import { UebaRepository } from './ueba.repository'
import { UebaService } from './ueba.service'
import { AiModule } from '../ai/ai.module'
import { AppLogsModule } from '../app-logs/app-logs.module'

@Module({
  imports: [AppLogsModule, forwardRef(() => AiModule)],
  controllers: [UebaController, AiUebaController],
  providers: [UebaRepository, UebaService, AiUebaService],
  exports: [UebaService],
})
export class UebaModule {}
