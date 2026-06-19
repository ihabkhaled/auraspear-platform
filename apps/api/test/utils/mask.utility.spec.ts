import { maskSecrets } from '../../src/common/utils/mask.utility'

describe('maskSecrets', () => {
  it('should mask known sensitive keys', () => {
    const input = {
      username: 'admin',
      password: 'secret123',
      apiKey: 'key-abc-123',
      host: 'localhost',
    }

    const result = maskSecrets(input)

    expect(result.username).toBe('admin')
    expect(result.password).toBe('***REDACTED***')
    expect(result.apiKey).toBe('***REDACTED***')
    expect(result.host).toBe('localhost')
  })

  it('should mask nested sensitive keys', () => {
    const input = {
      connector: {
        baseUrl: 'https://wazuh:55000',
        token: 'bearer-token-value',
        options: {
          secretAccessKey: 'aws-secret',
        },
      },
    }

    const result = maskSecrets(input)

    expect((result.connector as Record<string, unknown>).baseUrl).toBe('https://wazuh:55000')
    expect((result.connector as Record<string, unknown>).token).toBe('***REDACTED***')
    expect(
      ((result.connector as Record<string, unknown>).options as Record<string, unknown>)
        .secretAccessKey
    ).toBe('***REDACTED***')
  })

  it('should not mask empty values', () => {
    const input = { password: '', token: '' }
    const result = maskSecrets(input)
    expect(result.password).toBe('')
    expect(result.token).toBe('')
  })

  it('should pass through non-sensitive keys unchanged', () => {
    const input = { name: 'test', enabled: true, port: 5432 }
    const result = maskSecrets(input)
    expect(result).toEqual(input)
  })
})
