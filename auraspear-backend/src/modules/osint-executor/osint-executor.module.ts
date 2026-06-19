import { Module, forwardRef } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { OsintExecutorController } from './osint-executor.controller'
import { OsintExecutorService } from './osint-executor.service'
import { AxiosModule } from '../../common/modules/axios/axios.module'
import { AgentConfigModule } from '../agent-config/agent-config.module'
import { AppLogsModule } from '../app-logs/app-logs.module'

@Module({
  imports: [
    forwardRef(() => AgentConfigModule),
    AppLogsModule,
    AxiosModule,
    MulterModule.register({ storage: undefined, limits: { fileSize: 32 * 1024 * 1024 } }),
  ],
  controllers: [OsintExecutorController],
  providers: [OsintExecutorService],
  exports: [OsintExecutorService],
})
export class OsintExecutorModule {}
