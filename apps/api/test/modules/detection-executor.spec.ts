import { DetectionRulesExecutor } from '../../src/modules/detection-rules/detection-rules.executor'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

describe('DetectionRulesExecutor', () => {
  let executor: DetectionRulesExecutor

  beforeEach(() => {
    jest.clearAllMocks()
    executor = new DetectionRulesExecutor(mockAppLogger as never)
  })

  it('matches events against field conditions', async () => {
    const rule = {
      id: 'rule-1',
      name: 'SSH Brute Force',
      severity: 'high',
      conditions: { fields: { event_type: 'authentication_failure', protocol: 'ssh' } },
    }
    const events = [
      { event_type: 'authentication_failure', protocol: 'ssh', source_ip: '10.0.0.1' },
      { event_type: 'authentication_success', protocol: 'ssh', source_ip: '10.0.0.2' },
      { event_type: 'authentication_failure', protocol: 'rdp', source_ip: '10.0.0.3' },
    ]

    const result = await executor.evaluateRule(rule, events)
    expect(result.status).toBe('matched')
    expect(result.engine).toBe('field_match')
    expect(result.matchCount).toBe(1)
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0]?.ruleId).toBe('rule-1')
  })

  it('returns no_match when no events match', async () => {
    const rule = {
      id: 'rule-2',
      name: 'Test Rule',
      severity: 'low',
      conditions: { fields: { event_type: 'nonexistent' } },
    }
    const result = await executor.evaluateRule(rule, [{ event_type: 'auth' }])
    expect(result.status).toBe('no_match')
    expect(result.matchCount).toBe(0)
    expect(result.matches).toHaveLength(0)
  })

  it('performs case-insensitive string matching', async () => {
    const rule = {
      id: 'rule-3',
      name: 'Case Test',
      severity: 'medium',
      conditions: { fields: { action: 'LOGIN' } },
    }
    const events = [{ action: 'login_attempt' }]

    const result = await executor.evaluateRule(rule, events)
    expect(result.status).toBe('matched')
    expect(result.matchCount).toBe(1)
  })

  it('uses conditions directly when no fields key exists', async () => {
    const rule = {
      id: 'rule-4',
      name: 'Direct Conditions',
      severity: 'low',
      conditions: { event_type: 'dns_query', domain: 'evil' },
    }
    const events = [{ event_type: 'dns_query', domain: 'evil.com' }]

    const result = await executor.evaluateRule(rule, events)
    expect(result.status).toBe('matched')
  })

  it('evaluates Sigma selector conditions with nested fields and not logic', async () => {
    const rule = {
      id: 'rule-sigma-1',
      name: 'Suspicious PowerShell',
      severity: 'high',
      conditions: {
        sigma: `
title: Suspicious PowerShell
detection:
  selection:
    event.action|contains: powershell
    user.name|startswith: admin
  filter:
    process.command_line|contains: benign
  condition: selection and not filter
`,
      },
    }

    const events = [
      {
        event: { action: 'PowerShell Execution' },
        user: { name: 'administrator' },
        process: { command_line: 'powershell -enc SQBtAGFs' },
      },
      {
        event: { action: 'powershell execution' },
        user: { name: 'admin-user' },
        process: { command_line: 'benign powershell script' },
      },
    ]

    const result = await executor.evaluateRule(rule, events)

    expect(result.status).toBe('matched')
    expect(result.engine).toBe('sigma')
    expect(result.matchCount).toBe(1)
    expect(result.matches[0]?.description).toContain('Sigma')
  })

  it('evaluates YARA-L logical groups and numeric comparisons', async () => {
    const rule = {
      id: 'rule-yaral-1',
      name: 'High Volume Admin Authentication',
      severity: 'medium',
      conditions: {
        yaral: {
          title: 'High Volume Admin Authentication',
          match: {
            all: [
              { field: 'event.category', equals: 'authentication' },
              {
                any: [
                  { field: 'source.ip', in: ['10.0.0.5', '10.0.0.8'] },
                  { field: 'user.name', contains: 'admin' },
                ],
              },
              {
                not: {
                  field: 'process.name',
                  contains: 'healthcheck',
                },
              },
              { field: 'event.count', greaterThan: 5 },
            ],
          },
        },
      },
    }

    const events = [
      {
        event: { category: 'authentication', count: 9 },
        source: { ip: '10.0.0.5' },
        user: { name: 'svc-auth-admin' },
        process: { name: 'powershell.exe' },
      },
      {
        event: { category: 'authentication', count: 3 },
        source: { ip: '10.0.0.10' },
        user: { name: 'user-a' },
        process: { name: 'healthcheck-runner' },
      },
    ]

    const result = await executor.evaluateRule(rule, events)

    expect(result.status).toBe('matched')
    expect(result.engine).toBe('yaral')
    expect(result.matchCount).toBe(1)
    expect(result.matches[0]?.description).toContain('YARA-L')
  })

  it('returns error for invalid Sigma definitions', async () => {
    const rule = {
      id: 'rule-sigma-invalid',
      name: 'Broken Sigma',
      severity: 'high',
      conditions: {
        sigma: `
title: Broken Sigma
detection:
  condition: selection
`,
      },
    }

    const result = await executor.evaluateRule(rule, [{ event: { action: 'test' } }])

    expect(result.status).toBe('error')
    expect(result.engine).toBe('unknown')
    expect(result.error).toContain('at least one selector')
  })

  it('returns error for invalid YARA-L definitions', async () => {
    const rule = {
      id: 'rule-yaral-invalid',
      name: 'Broken YARA-L',
      severity: 'high',
      conditions: {
        yaral: {
          title: 'Broken YARA-L',
          match: {
            field: 'event.action',
          },
        },
      },
    }

    const result = await executor.evaluateRule(rule, [{ event: { action: 'test' } }])

    expect(result.status).toBe('error')
    expect(result.engine).toBe('unknown')
    expect(result.error).toContain('supported comparator')
  })

  it('returns error status on evaluation failure', async () => {
    const rule = {
      id: 'rule-5',
      name: 'Error Rule',
      severity: 'high',
      conditions: { fields: { event_type: 'test' } },
    }

    // Pass an object with length property but not iterable to force an error in for-of loop
    const result = await executor.evaluateRule(rule, { length: 1 } as unknown as Record<
      string,
      unknown
    >[])
    expect(result.status).toBe('error')
    expect(result.error).toBeDefined()
  })

  it('includes timing information in results', async () => {
    const rule = {
      id: 'rule-6',
      name: 'Timing Test',
      severity: 'info',
      conditions: { fields: { event_type: 'test' } },
    }

    const result = await executor.evaluateRule(rule, [{ event_type: 'test' }])
    expect(result.executedAt).toBeDefined()
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })
})
