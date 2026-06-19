import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { ChangePasswordSchema, type ChangePasswordDto } from './dto/change-password.dto'
import { UpdatePreferencesSchema, type UpdatePreferencesDto } from './dto/update-preferences.dto'
import { UpdateProfileSchema, type UpdateProfileDto } from './dto/update-profile.dto'
import { UsersService } from './users.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { UserProfile, UserPreferenceOrDefault } from './users.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { UserPreference } from '@prisma/client'

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard, TenantGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @RequirePermission(Permission.PROFILE_VIEW)
  async getProfile(@CurrentUser() user: JwtPayload): Promise<UserProfile> {
    return this.usersService.getProfile(user.sub)
  }

  @Patch('profile')
  @RequirePermission(Permission.PROFILE_UPDATE)
  async updateProfile(
    @Body(new ZodValidationPipe(UpdateProfileSchema)) dto: UpdateProfileDto,
    @CurrentUser() user: JwtPayload
  ): Promise<UserProfile> {
    return this.usersService.updateProfile(user.sub, dto)
  }

  @Post('change-password')
  @RequirePermission(Permission.PROFILE_UPDATE)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async changePassword(
    @Body(new ZodValidationPipe(ChangePasswordSchema)) dto: ChangePasswordDto,
    @CurrentUser() user: JwtPayload
  ): Promise<{ changed: boolean }> {
    return this.usersService.changePassword(user.sub, dto)
  }

  @Get('preferences')
  @RequirePermission(Permission.SETTINGS_VIEW)
  async getPreferences(@CurrentUser() user: JwtPayload): Promise<UserPreferenceOrDefault> {
    return this.usersService.getPreferences(user.sub)
  }

  @Patch('preferences')
  @RequirePermission(Permission.SETTINGS_UPDATE)
  async updatePreferences(
    @Body(new ZodValidationPipe(UpdatePreferencesSchema)) dto: UpdatePreferencesDto,
    @CurrentUser() user: JwtPayload
  ): Promise<UserPreference> {
    return this.usersService.updatePreferences(user.sub, dto)
  }
}
