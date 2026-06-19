import { Injectable, Logger } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { BCRYPT_SALT_ROUNDS } from './users.constants'
import { UsersRepository } from './users.repository'
import {
  DEFAULT_PREFERENCES,
  buildPreferenceCreateData,
  buildPreferenceUpdateData,
  mapUserToProfile,
} from './users.utilities'
import { AppLogFeature, AppLogOutcome, AppLogSourceType } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import type { ChangePasswordDto } from './dto/change-password.dto'
import type { UpdatePreferencesDto } from './dto/update-preferences.dto'
import type { UpdateProfileDto } from './dto/update-profile.dto'
import type { UserProfile } from './users.types'
import type { User, UserPreference } from '@prisma/client'

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.USERS, 'UsersService')
  }

  /* ---------------------------------------------------------------- */
  /* GET PROFILE                                                       */
  /* ---------------------------------------------------------------- */

  async getProfile(userId: string, tenantId?: string): Promise<UserProfile> {
    this.logger.log(`getProfile called for user ${userId}`)
    const user = await this.usersRepository.findByIdWithPreferencesAndMemberships(userId, tenantId)
    if (!user) {
      this.log.warn('getProfile', tenantId ?? '', 'User not found', { actorUserId: userId })
      throw new BusinessException(404, 'User not found', 'errors.users.notFound')
    }
    this.log.success('getProfile', tenantId ?? '', { actorUserId: userId, actorEmail: user.email })
    return mapUserToProfile(user)
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE PROFILE                                                    */
  /* ---------------------------------------------------------------- */

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    this.logger.log(`updateProfile called for user ${userId}`)
    const user = await this.findUserOrThrow(userId, 'updateProfile')
    await this.verifyPasswordOrThrow(user, dto.currentPassword, 'updateProfile')

    const updated = await this.usersRepository.updateName(userId, dto.name)
    this.logger.log(`Profile updated for user ${userId}`)
    this.log.success('updateProfile', '', { actorUserId: userId, actorEmail: user.email })
    return mapUserToProfile(updated)
  }

  /* ---------------------------------------------------------------- */
  /* CHANGE PASSWORD                                                   */
  /* ---------------------------------------------------------------- */

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ changed: boolean }> {
    this.logger.log(`changePassword called for user ${userId}`)
    const user = await this.findUserOrThrow(userId, 'changePassword')
    await this.verifyPasswordOrThrow(user, dto.currentPassword, 'changePassword')

    const hashedPassword = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS)
    await this.usersRepository.updatePasswordHash(userId, hashedPassword)

    this.logger.log(`Password changed for user ${userId}`)
    this.log.success('changePassword', '', { actorUserId: userId, actorEmail: user.email })
    return { changed: true }
  }

  /* ---------------------------------------------------------------- */
  /* GET PREFERENCES                                                   */
  /* ---------------------------------------------------------------- */

  async getPreferences(
    userId: string
  ): Promise<UserPreference | (typeof DEFAULT_PREFERENCES & { userId: string })> {
    this.logger.log(`getPreferences called for user ${userId}`)
    const user = await this.findUserOrThrow(userId, 'getPreferences')
    const preference = await this.usersRepository.findPreference(userId)
    this.log.success('getPreferences', '', { actorUserId: userId, actorEmail: user.email })
    return preference ?? { userId, ...DEFAULT_PREFERENCES }
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE PREFERENCES                                                */
  /* ---------------------------------------------------------------- */

  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<UserPreference> {
    this.logger.log(`updatePreferences called for user ${userId}`)
    const user = await this.findUserOrThrow(userId, 'updatePreferences')

    const preference = await this.usersRepository.upsertPreference(
      userId,
      buildPreferenceUpdateData(dto),
      buildPreferenceCreateData(dto)
    )

    this.logger.log(`Preferences updated for user ${userId}`)
    this.log.success('updatePreferences', '', {
      actorUserId: userId,
      actorEmail: user.email,
      theme: dto.theme ?? null,
      language: dto.language ?? null,
    })
    return preference
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Finders                                                  */
  /* ---------------------------------------------------------------- */

  private async findUserOrThrow(userId: string, action: string): Promise<User> {
    const user = await this.usersRepository.findById(userId)
    if (!user) {
      this.log.warn(action, '', 'User not found', { actorUserId: userId })
      throw new BusinessException(404, 'User not found', 'errors.users.notFound')
    }
    return user
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Password Verification                                    */
  /* ---------------------------------------------------------------- */

  private async verifyPasswordOrThrow(
    user: { id: string; email: string; passwordHash: string | null },
    password: string,
    action: string
  ): Promise<void> {
    if (!user.passwordHash) {
      this.logDenied(action, user.id, user.email)
      throw new BusinessException(400, 'Incorrect password', 'errors.users.incorrectPassword')
    }
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      this.logDenied(action, user.id, user.email)
      throw new BusinessException(400, 'Incorrect password', 'errors.users.incorrectPassword')
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Logging                                                  */
  /* ---------------------------------------------------------------- */

  private logDenied(action: string, userId: string, email: string): void {
    this.appLogger.warn(`UsersService => ${action} denied`, {
      feature: AppLogFeature.USERS,
      action,
      outcome: AppLogOutcome.DENIED,
      actorUserId: userId,
      actorEmail: email,
      targetResource: 'User',
      targetResourceId: userId,
      sourceType: AppLogSourceType.SERVICE,
      className: 'UsersService',
      functionName: action,
    })
  }
}
