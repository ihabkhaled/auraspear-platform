import { Module, forwardRef } from '@nestjs/common'
import { AgentConfigController } from './agent-config.controller'
import { AgentConfigRepository } from './agent-config.repository'
import { AgentConfigService } from './agent-config.service'
import { AppLogsModule } from '../app-logs/app-logs.module'
import { OsintExecutorModule } from '../osint-executor/osint-executor.module'

@Module({
  imports: [AppLogsModule, forwardRef(() => OsintExecutorModule)],
  controllers: [AgentConfigController],
  providers: [AgentConfigRepository, AgentConfigService],
  exports: [AgentConfigService, AgentConfigRepository],
})
export class AgentConfigModule {}
