import { Global, Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthRepository } from './auth.repository'
import { AuthService } from './auth.service'
import { PlatformAdminBootstrapRepository } from './platform-admin-bootstrap.repository'
import { PlatformAdminBootstrapService } from './platform-admin-bootstrap.service'
import { TokenBlacklistService } from './token-blacklist.service'
import { AppLogsModule } from '../app-logs/app-logs.module'

@Global()
@Module({
  imports: [AppLogsModule],
  controllers: [AuthController],
  providers: [
    AuthRepository,
    AuthService,
    TokenBlacklistService,
    PlatformAdminBootstrapRepository,
    PlatformAdminBootstrapService,
  ],
  exports: [AuthService, PlatformAdminBootstrapService],
})
export class AuthModule {}
