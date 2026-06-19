import { Module } from '@nestjs/common'
import { CaseCyclesController } from './case-cycles.controller'
import { CaseCyclesRepository } from './case-cycles.repository'
import { CaseCyclesService } from './case-cycles.service'
import { AppLogsModule } from '../app-logs/app-logs.module'

@Module({
  imports: [AppLogsModule],
  controllers: [CaseCyclesController],
  providers: [CaseCyclesRepository, CaseCyclesService],
  exports: [CaseCyclesService],
})
export class CaseCyclesModule {}
