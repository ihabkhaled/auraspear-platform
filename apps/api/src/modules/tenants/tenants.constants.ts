export const TENANT_SORT_FIELDS: Record<string, string> = {
  slug: 'slug',
  createdAt: 'createdAt',
  name: 'name',
}

export const USER_SORT_FIELDS: Record<string, string> = {
  role: 'role',
  status: 'status',
  createdAt: 'createdAt',
}

/** Fields needed from User when listing members — excludes passwordHash and oidcSub */
export const USER_MEMBER_SELECT = {
  select: {
    id: true,
    email: true,
    name: true,
    mfaEnabled: true,
    isProtected: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
  },
} as const
