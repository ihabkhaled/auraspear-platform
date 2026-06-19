import { redactSensitiveFields, SENSITIVE_KEYS } from '../../src/common/utils/redaction.utility'

describe('redaction.util — redactSensitiveFields', () => {
  /* ------------------------------------------------------------------ */
  /* Basic redaction                                                      */
  /* ------------------------------------------------------------------ */

  it('should redact "password" field', () => {
    const result = redactSensitiveFields({ password: 'secret123' })
    expect(result.password).toBe('[REDACTED]')
  })

  it('should redact "apiKey" field', () => {
    const result = redactSensitiveFields({ apiKey: 'ak-123456' })
    expect(result.apiKey).toBe('[REDACTED]')
  })

  it('should redact "token" field', () => {
    const result = redactSensitiveFields({ token: 'jwt.token.value' })
    expect(result.token).toBe('[REDACTED]')
  })

  it('should redact "secretAccessKey" field', () => {
    const result = redactSensitiveFields({ secretAccessKey: 'aws-secret' })
    expect(result.secretAccessKey).toBe('[REDACTED]')
  })

  it('should redact "authorization" field', () => {
    const result = redactSensitiveFields({ authorization: 'Bearer xyz' })
    expect(result.authorization).toBe('[REDACTED]')
  })

  it('should redact "refreshToken" field', () => {
    const result = redactSensitiveFields({ refreshToken: 'refresh-abc' })
    expect(result.refreshToken).toBe('[REDACTED]')
  })

  it('should redact "accessToken" field', () => {
    const result = redactSensitiveFields({ accessToken: 'access-xyz' })
    expect(result.accessToken).toBe('[REDACTED]')
  })

  it('should redact "currentPassword" and "newPassword" fields', () => {
    const result = redactSensitiveFields({
      currentPassword: 'old',
      newPassword: 'new',
      confirmPassword: 'new',
    })
    expect(result.currentPassword).toBe('[REDACTED]')
    expect(result.newPassword).toBe('[REDACTED]')
    expect(result.confirmPassword).toBe('[REDACTED]')
  })

  /* ------------------------------------------------------------------ */
  /* Non-sensitive fields preserved                                      */
  /* ------------------------------------------------------------------ */

  it('should NOT redact non-sensitive fields (name, email, action)', () => {
    const input = { name: 'John', email: 'john@test.com', action: 'CREATE' }
    const result = redactSensitiveFields(input)

    expect(result.name).toBe('John')
    expect(result.email).toBe('john@test.com')
    expect(result.action).toBe('CREATE')
  })

  it('should preserve non-sensitive fields alongside redacted ones', () => {
    const result = redactSensitiveFields({
      username: 'admin',
      password: 'secret',
      role: 'TENANT_ADMIN',
    })

    expect(result.username).toBe('admin')
    expect(result.password).toBe('[REDACTED]')
    expect(result.role).toBe('TENANT_ADMIN')
  })

  /* ------------------------------------------------------------------ */
  /* Nested objects                                                       */
  /* ------------------------------------------------------------------ */

  it('should handle nested objects (redact deep sensitive keys)', () => {
    const result = redactSensitiveFields({
      user: {
        name: 'Admin',
        password: 'nested-secret',
        config: {
          apiKey: 'deep-key',
          endpoint: 'https://api.test.com',
        },
      },
    })

    const user = result.user as Record<string, unknown>
    expect(user.name).toBe('Admin')
    expect(user.password).toBe('[REDACTED]')

    const config = user.config as Record<string, unknown>
    expect(config.apiKey).toBe('[REDACTED]')
    expect(config.endpoint).toBe('https://api.test.com')
  })

  /* ------------------------------------------------------------------ */
  /* Arrays of objects                                                    */
  /* ------------------------------------------------------------------ */

  it('should handle arrays of objects', () => {
    const result = redactSensitiveFields({
      users: [
        { name: 'Alice', password: 'pass1' },
        { name: 'Bob', token: 'tok2' },
      ],
    })

    const users = result.users as Array<Record<string, unknown>>
    expect(users[0].name).toBe('Alice')
    expect(users[0].password).toBe('[REDACTED]')
    expect(users[1].name).toBe('Bob')
    expect(users[1].token).toBe('[REDACTED]')
  })

  it('should preserve primitive values in arrays', () => {
    const result = redactSensitiveFields({
      tags: ['alert', 'critical', 'malware'],
    })

    expect(result.tags).toEqual(['alert', 'critical', 'malware'])
  })

  /* ------------------------------------------------------------------ */
  /* Depth limiting                                                      */
  /* ------------------------------------------------------------------ */

  it('should stop recursion at MAX_REDACT_DEPTH (depth 5)', () => {
    // Build an object nested 6 levels deep with a sensitive key at the bottom
    const deepObject: Record<string, unknown> = {
      l1: {
        l2: {
          l3: {
            l4: {
              l5: {
                l6: {
                  password: 'should-not-be-redacted',
                },
              },
            },
          },
        },
      },
    }

    const result = redactSensitiveFields(deepObject)

    // Navigate to depth 5 — at this point, depth === 5 which equals MAX_REDACT_DEPTH,
    // so the l6 object should be passed through as-is (not recursed)
    const l5 = (
      (
        ((result.l1 as Record<string, unknown>).l2 as Record<string, unknown>).l3 as Record<
          string,
          unknown
        >
      ).l4 as Record<string, unknown>
    ).l5 as Record<string, unknown>

    // l6 is at depth 5, so it should NOT be recursed into — it should be left as-is
    const l6 = l5.l6 as Record<string, unknown>
    expect(l6.password).toBe('should-not-be-redacted')
  })

  it('should redact at depth 4 (within MAX_REDACT_DEPTH)', () => {
    const object: Record<string, unknown> = {
      l1: {
        l2: {
          l3: {
            l4: {
              password: 'should-be-redacted',
            },
          },
        },
      },
    }

    const result = redactSensitiveFields(object)

    const l4 = (
      ((result.l1 as Record<string, unknown>).l2 as Record<string, unknown>).l3 as Record<
        string,
        unknown
      >
    ).l4 as Record<string, unknown>
    expect(l4.password).toBe('[REDACTED]')
  })

  /* ------------------------------------------------------------------ */
  /* Edge cases                                                          */
  /* ------------------------------------------------------------------ */

  it('should handle empty object', () => {
    const result = redactSensitiveFields({})
    expect(result).toEqual({})
  })

  it('should handle null values without crashing', () => {
    const result = redactSensitiveFields({
      name: null,
      password: null,
      config: null,
    })

    // null password is a sensitive key, so it should still be redacted
    expect(result.password).toBe('[REDACTED]')
    // null non-sensitive key should remain null
    expect(result.name).toBeNull()
    // null config should remain null (not treated as an object to recurse into)
    expect(result.config).toBeNull()
  })

  it('should handle undefined values without crashing', () => {
    const result = redactSensitiveFields({
      name: undefined,
      token: undefined,
    })

    // undefined token is a sensitive key, so it should be redacted
    expect(result.token).toBe('[REDACTED]')
    expect(result.name).toBeUndefined()
  })

  /* ------------------------------------------------------------------ */
  /* Completeness: all SENSITIVE_KEYS are redacted                       */
  /* ------------------------------------------------------------------ */

  it('should redact every key in SENSITIVE_KEYS', () => {
    const input: Record<string, unknown> = {}
    for (const key of SENSITIVE_KEYS) {
      input[key] = `value-for-${key}`
    }

    const result = redactSensitiveFields(input)

    for (const key of SENSITIVE_KEYS) {
      expect(result[key]).toBe('[REDACTED]')
    }
  })
})
