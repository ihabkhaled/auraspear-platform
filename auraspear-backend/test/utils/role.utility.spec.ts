import { UserRole } from '../../src/common/interfaces/authenticated-request.interface'
import { hasRoleAtLeast } from '../../src/common/utils/role.utility'

describe('role.util — hasRoleAtLeast', () => {
  /* ------------------------------------------------------------------ */
  /* GLOBAL_ADMIN (highest privilege)                                     */
  /* ------------------------------------------------------------------ */

  it('GLOBAL_ADMIN has at least GLOBAL_ADMIN → true', () => {
    expect(hasRoleAtLeast(UserRole.GLOBAL_ADMIN, UserRole.GLOBAL_ADMIN)).toBe(true)
  })

  it('GLOBAL_ADMIN has at least TENANT_ADMIN → true', () => {
    expect(hasRoleAtLeast(UserRole.GLOBAL_ADMIN, UserRole.TENANT_ADMIN)).toBe(true)
  })

  it('GLOBAL_ADMIN has at least SOC_ANALYST_L2 → true', () => {
    expect(hasRoleAtLeast(UserRole.GLOBAL_ADMIN, UserRole.SOC_ANALYST_L2)).toBe(true)
  })

  it('GLOBAL_ADMIN has at least SOC_ANALYST_L1 → true', () => {
    expect(hasRoleAtLeast(UserRole.GLOBAL_ADMIN, UserRole.SOC_ANALYST_L1)).toBe(true)
  })

  it('GLOBAL_ADMIN has at least EXECUTIVE_READONLY → true', () => {
    expect(hasRoleAtLeast(UserRole.GLOBAL_ADMIN, UserRole.EXECUTIVE_READONLY)).toBe(true)
  })

  /* ------------------------------------------------------------------ */
  /* TENANT_ADMIN                                                        */
  /* ------------------------------------------------------------------ */

  it('TENANT_ADMIN has at least GLOBAL_ADMIN → false', () => {
    expect(hasRoleAtLeast(UserRole.TENANT_ADMIN, UserRole.GLOBAL_ADMIN)).toBe(false)
  })

  it('TENANT_ADMIN has at least TENANT_ADMIN → true (equal)', () => {
    expect(hasRoleAtLeast(UserRole.TENANT_ADMIN, UserRole.TENANT_ADMIN)).toBe(true)
  })

  it('TENANT_ADMIN has at least SOC_ANALYST_L1 → true', () => {
    expect(hasRoleAtLeast(UserRole.TENANT_ADMIN, UserRole.SOC_ANALYST_L1)).toBe(true)
  })

  /* ------------------------------------------------------------------ */
  /* SOC_ANALYST_L1                                                      */
  /* ------------------------------------------------------------------ */

  it('SOC_ANALYST_L1 has at least TENANT_ADMIN → false', () => {
    expect(hasRoleAtLeast(UserRole.SOC_ANALYST_L1, UserRole.TENANT_ADMIN)).toBe(false)
  })

  it('SOC_ANALYST_L1 has at least SOC_ANALYST_L1 → true (equal)', () => {
    expect(hasRoleAtLeast(UserRole.SOC_ANALYST_L1, UserRole.SOC_ANALYST_L1)).toBe(true)
  })

  it('SOC_ANALYST_L1 has at least EXECUTIVE_READONLY → true', () => {
    expect(hasRoleAtLeast(UserRole.SOC_ANALYST_L1, UserRole.EXECUTIVE_READONLY)).toBe(true)
  })

  /* ------------------------------------------------------------------ */
  /* EXECUTIVE_READONLY (lowest privilege)                               */
  /* ------------------------------------------------------------------ */

  it('EXECUTIVE_READONLY has at least EXECUTIVE_READONLY → true (equal)', () => {
    expect(hasRoleAtLeast(UserRole.EXECUTIVE_READONLY, UserRole.EXECUTIVE_READONLY)).toBe(true)
  })

  it('EXECUTIVE_READONLY has at least SOC_ANALYST_L1 → false', () => {
    expect(hasRoleAtLeast(UserRole.EXECUTIVE_READONLY, UserRole.SOC_ANALYST_L1)).toBe(false)
  })

  it('EXECUTIVE_READONLY has at least GLOBAL_ADMIN → false', () => {
    expect(hasRoleAtLeast(UserRole.EXECUTIVE_READONLY, UserRole.GLOBAL_ADMIN)).toBe(false)
  })

  /* ------------------------------------------------------------------ */
  /* THREAT_HUNTER                                                       */
  /* ------------------------------------------------------------------ */

  it('THREAT_HUNTER has at least THREAT_HUNTER → true (equal)', () => {
    expect(hasRoleAtLeast(UserRole.THREAT_HUNTER, UserRole.THREAT_HUNTER)).toBe(true)
  })

  it('THREAT_HUNTER has at least SOC_ANALYST_L1 → true', () => {
    expect(hasRoleAtLeast(UserRole.THREAT_HUNTER, UserRole.SOC_ANALYST_L1)).toBe(true)
  })

  it('THREAT_HUNTER has at least TENANT_ADMIN → false', () => {
    expect(hasRoleAtLeast(UserRole.THREAT_HUNTER, UserRole.TENANT_ADMIN)).toBe(false)
  })

  /* ------------------------------------------------------------------ */
  /* Unknown / invalid role                                              */
  /* ------------------------------------------------------------------ */

  it('unknown userRole → false', () => {
    expect(hasRoleAtLeast('UNKNOWN_ROLE' as UserRole, UserRole.SOC_ANALYST_L1)).toBe(false)
  })

  it('unknown requiredRole → false', () => {
    expect(hasRoleAtLeast(UserRole.GLOBAL_ADMIN, 'UNKNOWN_ROLE' as UserRole)).toBe(false)
  })

  it('both roles unknown → false', () => {
    expect(hasRoleAtLeast('ROLE_A' as UserRole, 'ROLE_B' as UserRole)).toBe(false)
  })
})
