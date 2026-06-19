import { Module } from '@nestjs/common'
import { ConnectorsController } from './connectors.controller'
import { ConnectorsRepository } from './connectors.repository'
import { ConnectorsService } from './connectors.service'
import { AppLogsModule } from '../app-logs/app-logs.module'
import { BedrockService } from './services/bedrock.service'
import { GrafanaService } from './services/grafana.service'
import { GraylogService } from './services/graylog.service'
import { InfluxDBService } from './services/influxdb.service'
import { LlmApisService } from './services/llm-apis.service'
import { LogstashService } from './services/logstash.service'
import { MispService } from './services/misp.service'
import { OpenClawGatewayService } from './services/openclaw-gateway.service'
import { OpenSearchService } from './services/opensearch.service'
import { ShuffleService } from './services/shuffle.service'
import { VelociraptorService } from './services/velociraptor.service'
import { WazuhService } from './services/wazuh.service'
import { AxiosModule } from '../../common/modules/axios'

@Module({
  imports: [AppLogsModule, AxiosModule],
  controllers: [ConnectorsController],
  providers: [
    ConnectorsRepository,
    ConnectorsService,
    WazuhService,
    OpenSearchService,
    GraylogService,
    LogstashService,
    VelociraptorService,
    GrafanaService,
    InfluxDBService,
    MispService,
    ShuffleService,
    BedrockService,
    LlmApisService,
    OpenClawGatewayService,
  ],
  exports: [
    ConnectorsRepository,
    ConnectorsService,
    WazuhService,
    GraylogService,
    LogstashService,
    VelociraptorService,
    GrafanaService,
    InfluxDBService,
    MispService,
    ShuffleService,
    BedrockService,
    LlmApisService,
    OpenClawGatewayService,
  ],
})
export class ConnectorsModule {}
