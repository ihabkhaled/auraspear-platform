import { DEFAULT_PREFERENCES, PREFERENCE_FIELD_KEYS } from './users.constants'
import type { UpdatePreferencesDto } from './dto/update-preferences.dto'
import type { UserProfile, UserWithMemberships } from './users.types'

export { DEFAULT_PREFERENCES }

/* ---------------------------------------------------------------- */
/* PROFILE MAPPING                                                   */
/* ---------------------------------------------------------------- */

export function mapUserToProfile(user: UserWithMemberships): UserProfile {
  const { passwordHash: _passwordHash, memberships, ...rest } = user
  const firstMembership = memberships[0]
  return {
    ...rest,
    tenant: firstMembership?.tenant ?? null,
    preference: user.preference,
  }
}

/* ---------------------------------------------------------------- */
/* PREFERENCE UPDATE/CREATE DATA                                     */
/* ---------------------------------------------------------------- */

export function buildPreferenceUpdateData(dto: UpdatePreferencesDto): Record<string, unknown> {
  const dataMap = new Map<string, unknown>()
  const dtoMap = new Map<string, unknown>(
    Object.entries(dto as Record<string, unknown>)
  )

  for (const key of PREFERENCE_FIELD_KEYS) {
    const value = dtoMap.get(key)
    if (value !== undefined) {
      dataMap.set(key, value)
    }
  }

  return Object.fromEntries(dataMap)
}

export function buildPreferenceCreateData(dto: UpdatePreferencesDto): typeof DEFAULT_PREFERENCES {
  const dtoMap = new Map<string, unknown>(
    Object.entries(dto as Record<string, unknown>)
  )
  const defaultsMap = new Map<string, unknown>(
    Object.entries(DEFAULT_PREFERENCES as Record<string, unknown>)
  )
  const resultMap = new Map<string, unknown>()

  for (const key of PREFERENCE_FIELD_KEYS) {
    resultMap.set(key, dtoMap.get(key) ?? defaultsMap.get(key))
  }

  return Object.fromEntries(resultMap) as typeof DEFAULT_PREFERENCES
}
