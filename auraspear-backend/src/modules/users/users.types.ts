import type { Tenant, User, UserPreference } from '@prisma/client'

export type UserProfile = Omit<User, 'passwordHash'> & {
  tenant: Tenant | null
  preference: UserPreference | null
}

export type UserPreferenceOrDefault =
  | UserPreference
  | {
      userId: string
      theme: string
      language: string
      notificationsEmail: boolean
      notificationsInApp: boolean
    }

export interface UserWithMemberships extends User {
  memberships: Array<{ tenant: Tenant }>
  preference: UserPreference | null
}
