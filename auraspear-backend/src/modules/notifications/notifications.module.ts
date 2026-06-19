import { Module, forwardRef } from '@nestjs/common'
import { NotificationsController } from './notifications.controller'
import { NotificationsGateway } from './notifications.gateway'
import { NotificationsRepository } from './notifications.repository'
import { NotificationsService } from './notifications.service'
import { AppLogsModule } from '../app-logs/app-logs.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AppLogsModule, forwardRef(() => AuthModule)],
  controllers: [NotificationsController],
  providers: [NotificationsRepository, NotificationsService, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
