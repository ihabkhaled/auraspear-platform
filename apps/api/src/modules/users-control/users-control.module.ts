import { Module } from '@nestjs/common'
import { UsersControlController } from './users-control.controller'
import { UsersControlRepository } from './users-control.repository'
import { UsersControlService } from './users-control.service'
import { AppLogsModule } from '../app-logs/app-logs.module'

@Module({
  imports: [AppLogsModule],
  controllers: [UsersControlController],
  providers: [UsersControlService, UsersControlRepository],
})
export class UsersControlModule {}
