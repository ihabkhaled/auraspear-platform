import * as bcrypt from 'bcryptjs'
import { AUTH_BCRYPT_SALT_ROUNDS } from './auth.constants'

/**
 * Resolve the password hash for the platform admin.
 * If no existing hash, create a new one.
 * If existing hash matches the configured password, reuse it.
 * Otherwise, create a new hash from the configured password.
 */
export async function resolvePasswordHash(
  configuredPassword: string,
  existingPasswordHash: string | null | undefined
): Promise<string> {
  if (existingPasswordHash === undefined || existingPasswordHash === null) {
    return bcrypt.hash(configuredPassword, AUTH_BCRYPT_SALT_ROUNDS)
  }

  const matchesConfiguredPassword = await bcrypt.compare(
    configuredPassword,
    existingPasswordHash
  )

  return matchesConfiguredPassword
    ? existingPasswordHash
    : bcrypt.hash(configuredPassword, AUTH_BCRYPT_SALT_ROUNDS)
}
