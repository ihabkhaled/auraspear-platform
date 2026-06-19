import { Module } from '@nestjs/common'
import { ConnectorWorkspaceFactoryService } from './connector-workspace-factory.service'
import { ConnectorWorkspacesController } from './connector-workspaces.controller'
import { ConnectorWorkspacesService } from './connector-workspaces.service'
import { AppLogsModule } from '../app-logs/app-logs.module'
import { ConnectorsModule } from '../connectors/connectors.module'
import { BedrockWorkspaceStrategy } from './strategies/bedrock-workspace.strategy'
import { GrafanaWorkspaceStrategy } from './strategies/grafana-workspace.strategy'
import { GraylogWorkspaceStrategy } from './strategies/graylog-workspace.strategy'
import { InfluxDBWorkspaceStrategy } from './strategies/influxdb-workspace.strategy'
import { LogstashWorkspaceStrategy } from './strategies/logstash-workspace.strategy'
import { MispWorkspaceStrategy } from './strategies/misp-workspace.strategy'
import { ShuffleWorkspaceStrategy } from './strategies/shuffle-workspace.strategy'
import { VelociraptorWorkspaceStrategy } from './strategies/velociraptor-workspace.strategy'
import { WazuhWorkspaceStrategy } from './strategies/wazuh-workspace.strategy'

@Module({
  imports: [ConnectorsModule, AppLogsModule],
  controllers: [ConnectorWorkspacesController],
  providers: [
    ConnectorWorkspacesService,
    ConnectorWorkspaceFactoryService,
    WazuhWorkspaceStrategy,
    GraylogWorkspaceStrategy,
    LogstashWorkspaceStrategy,
    VelociraptorWorkspaceStrategy,
    GrafanaWorkspaceStrategy,
    InfluxDBWorkspaceStrategy,
    MispWorkspaceStrategy,
    ShuffleWorkspaceStrategy,
    BedrockWorkspaceStrategy,
  ],
  exports: [ConnectorWorkspacesService],
})
export class ConnectorWorkspacesModule {}
