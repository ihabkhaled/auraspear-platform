import { Module } from '@nestjs/common'
import { HuntsController } from './hunts.controller'
import { HuntsRepository } from './hunts.repository'
import { HuntsService } from './hunts.service'
import { AppLogsModule } from '../app-logs/app-logs.module'
import { ConnectorsModule } from '../connectors/connectors.module'

@Module({
  imports: [ConnectorsModule, AppLogsModule],
  controllers: [HuntsController],
  providers: [HuntsService, HuntsRepository],
  exports: [HuntsService],
})
export class HuntsModule {}
