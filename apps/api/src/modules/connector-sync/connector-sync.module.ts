import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { ConnectorSyncController } from './connector-sync.controller'
import { ConnectorSyncRepository } from './connector-sync.repository'
import { ConnectorSyncService } from './connector-sync.service'
import { AlertsModule } from '../alerts/alerts.module'
import { AppLogsModule } from '../app-logs/app-logs.module'
import { ConnectorsModule } from '../connectors/connectors.module'
import { EntitiesModule } from '../entities/entities.module'
import { IntelModule } from '../intel/intel.module'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConnectorsModule,
    AlertsModule,
    EntitiesModule,
    IntelModule,
    AppLogsModule,
  ],
  controllers: [ConnectorSyncController],
  providers: [ConnectorSyncRepository, ConnectorSyncService],
  exports: [ConnectorSyncService],
})
export class ConnectorSyncModule {}
