import { Module } from '@nestjs/common'
import { UsersController } from './users.controller'
import { UsersRepository } from './users.repository'
import { UsersService } from './users.service'
import { AppLogsModule } from '../app-logs/app-logs.module'

@Module({
  imports: [AppLogsModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
