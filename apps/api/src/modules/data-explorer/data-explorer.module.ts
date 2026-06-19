import { Module } from '@nestjs/common'
import { DataExplorerController } from './data-explorer.controller'
import { DataExplorerRepository } from './data-explorer.repository'
import { DataExplorerService } from './data-explorer.service'
import { AppLogsModule } from '../app-logs/app-logs.module'
import { ConnectorsModule } from '../connectors/connectors.module'

@Module({
  imports: [ConnectorsModule, AppLogsModule],
  controllers: [DataExplorerController],
  providers: [DataExplorerRepository, DataExplorerService],
  exports: [DataExplorerService],
})
export class DataExplorerModule {}
