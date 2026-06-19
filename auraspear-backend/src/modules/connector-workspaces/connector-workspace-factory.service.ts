import { Injectable } from '@nestjs/common'
import { BedrockWorkspaceStrategy } from './strategies/bedrock-workspace.strategy'
import { GrafanaWorkspaceStrategy } from './strategies/grafana-workspace.strategy'
import { GraylogWorkspaceStrategy } from './strategies/graylog-workspace.strategy'
import { InfluxDBWorkspaceStrategy } from './strategies/influxdb-workspace.strategy'
import { LogstashWorkspaceStrategy } from './strategies/logstash-workspace.strategy'
import { MispWorkspaceStrategy } from './strategies/misp-workspace.strategy'
import { ShuffleWorkspaceStrategy } from './strategies/shuffle-workspace.strategy'
import { VelociraptorWorkspaceStrategy } from './strategies/velociraptor-workspace.strategy'
import { WazuhWorkspaceStrategy } from './strategies/wazuh-workspace.strategy'
import { AppLogFeature } from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import type { ConnectorWorkspaceStrategy } from './types/connector-workspace.types'

@Injectable()
export class ConnectorWorkspaceFactoryService {
  private readonly strategies: Map<string, ConnectorWorkspaceStrategy>
  private readonly log: ServiceLogger

  constructor(
    wazuh: WazuhWorkspaceStrategy,
    graylog: GraylogWorkspaceStrategy,
    logstash: LogstashWorkspaceStrategy,
    velociraptor: VelociraptorWorkspaceStrategy,
    grafana: GrafanaWorkspaceStrategy,
    influxdb: InfluxDBWorkspaceStrategy,
    misp: MispWorkspaceStrategy,
    shuffle: ShuffleWorkspaceStrategy,
    bedrock: BedrockWorkspaceStrategy,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(
      this.appLogger,
      AppLogFeature.CONNECTOR_WORKSPACES,
      'ConnectorWorkspaceFactoryService'
    )
    this.strategies = new Map<string, ConnectorWorkspaceStrategy>([
      ['wazuh', wazuh],
      ['graylog', graylog],
      ['logstash', logstash],
      ['velociraptor', velociraptor],
      ['grafana', grafana],
      ['influxdb', influxdb],
      ['misp', misp],
      ['shuffle', shuffle],
      ['bedrock', bedrock],
    ])
  }

  getStrategy(connectorType: string): ConnectorWorkspaceStrategy | undefined {
    const strategy = this.strategies.get(connectorType)

    if (strategy) {
      this.log.success('getStrategy', 'system', { connectorType, found: true })
    } else {
      this.log.error('getStrategy', 'system', new Error('Strategy not found'), {
        connectorType,
        found: false,
      })
    }

    return strategy
  }

  hasStrategy(connectorType: string): boolean {
    const exists = this.strategies.has(connectorType)

    this.log.success('hasStrategy', 'system', { connectorType, exists })

    return exists
  }
}
