import { Module, forwardRef } from '@nestjs/common'
import { TenantsController } from './tenants.controller'
import { TenantsRepository } from './tenants.repository'
import { TenantsService } from './tenants.service'
import { AppLogsModule } from '../app-logs/app-logs.module'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [AppLogsModule, forwardRef(() => NotificationsModule)],
  controllers: [TenantsController],
  providers: [TenantsService, TenantsRepository],
  exports: [TenantsService],
})
export class TenantsModule {}
