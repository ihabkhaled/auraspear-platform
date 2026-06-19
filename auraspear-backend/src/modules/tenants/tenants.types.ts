export interface TenantRecord {
  id: string
  name: string
  slug: string
  createdAt: Date
}

export interface TenantWithCounts extends TenantRecord {
  userCount: number
  alertCount: number
  caseCount: number
}

export interface UserRecord {
  id: string
  email: string
  name: string
  role: string
  status: string
  lastLoginAt: Date | null
  mfaEnabled: boolean
  isProtected: boolean
  createdAt: Date
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CheckEmailResult {
  exists: boolean
  user: { id: string; name: string; email: string } | null
  alreadyInTenant: boolean
}

/** Lightweight user info for assignee pickers — accessible to all authenticated users. */
export interface TenantMember {
  id: string
  name: string
  email: string
}

/** Privacy-safe user info for non-admin users — omits sensitive fields like email. */
export interface TenantMemberLimited {
  id: string
  name: string
}

export interface FindOrCreateUserFields {
  id: string
  email: string
  name: string
  lastLoginAt: Date | null
  mfaEnabled: boolean
  isProtected: boolean
}

export interface FindOrCreateMembershipFields {
  role: string
  status: string
  createdAt: Date
}

export interface FindOrCreateUserResult {
  user: FindOrCreateUserFields
  membership: FindOrCreateMembershipFields
  isExisting: boolean
}

export interface ImpersonationSessionResult {
  accessToken: string
  refreshToken: string
  user: {
    sub: string
    email: string
    tenantId: string
    tenantSlug: string
    role: string
  }
  impersonator: {
    sub: string
    email: string
    role: string
    tenantId: string
    tenantSlug: string
  }
}

/** Response returned by the impersonate-user endpoint. */
export interface TenantWithDatabaseCounts {
  id: string
  name: string
  slug: string
  createdAt: Date
  _count: { memberships: number; alerts: number; cases: number }
}

export interface MembershipWithUser {
  role: string
  status: string
  createdAt: Date
  user: {
    id: string
    email: string
    name: string
    lastLoginAt: Date | null
    mfaEnabled: boolean
    isProtected: boolean
  }
}

export interface ImpersonateUserResponse {
  accessToken: string
  csrfToken: string
  user: {
    sub: string
    email: string
    tenantId: string
    tenantSlug: string
    role: string
  }
  impersonator: {
    sub: string
    email: string
    role: string
    tenantId: string
    tenantSlug: string
  }
}
