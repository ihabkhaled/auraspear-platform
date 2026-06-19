import { Global, Module, forwardRef } from '@nestjs/common'
import { PermissionCacheService } from './permission-cache.service'
import { RoleSettingsController } from './role-settings.controller'
import { RoleSettingsRepository } from './role-settings.repository'
import { RoleSettingsService } from './role-settings.service'
import { AppLogsModule } from '../app-logs/app-logs.module'
import { NotificationsModule } from '../notifications/notifications.module'

@Global()
@Module({
  imports: [AppLogsModule, forwardRef(() => NotificationsModule)],
  controllers: [RoleSettingsController],
  providers: [RoleSettingsRepository, RoleSettingsService, PermissionCacheService],
  exports: [RoleSettingsService, PermissionCacheService],
})
export class RoleSettingsModule {}
