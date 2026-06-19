import { toDay, nowDate } from '../../src/common/utils/date-time.utility'
import { CorrelationExecutor } from '../../src/modules/correlation/correlation.executor'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

describe('CorrelationExecutor', () => {
  let executor: CorrelationExecutor

  beforeEach(() => {
    jest.clearAllMocks()
    executor = new CorrelationExecutor(mockAppLogger as never)
  })

  it('triggers when threshold is exceeded', async () => {
    const now = nowDate()
    const rule = {
      id: 'cor-1',
      name: 'Failed Login Burst',
      eventTypes: ['auth_failure'],
      threshold: 3,
      timeWindowMinutes: 5,
    }
    const events = [
      {
        type: 'auth_failure',
        timestamp: toDay(now.getTime() - 60000)
          .toDate()
          .toISOString(),
        data: {},
      },
      {
        type: 'auth_failure',
        timestamp: toDay(now.getTime() - 30000)
          .toDate()
          .toISOString(),
        data: {},
      },
      { type: 'auth_failure', timestamp: now.toISOString(), data: {} },
    ]

    const result = await executor.evaluateRule(rule, events)
    expect(result.status).toBe('triggered')
    expect(result.eventsCorrelated).toBe(3)
    expect(result.triggeredAt).toBeDefined()
    expect(result.description).toContain('3')
  })

  it('does not trigger below threshold', async () => {
    const now = nowDate()
    const rule = {
      id: 'cor-2',
      name: 'Test',
      eventTypes: ['auth_failure'],
      threshold: 5,
      timeWindowMinutes: 5,
    }
    const events = [{ type: 'auth_failure', timestamp: now.toISOString(), data: {} }]

    const result = await executor.evaluateRule(rule, events)
    expect(result.status).toBe('not_triggered')
    expect(result.eventsCorrelated).toBe(1)
  })

  it('groups by field and triggers per group', async () => {
    const now = nowDate()
    const rule = {
      id: 'cor-3',
      name: 'Per-User Failed Logins',
      eventTypes: ['auth_failure'],
      threshold: 2,
      timeWindowMinutes: 5,
      groupBy: 'username',
    }
    const events = [
      {
        type: 'auth_failure',
        timestamp: now.toISOString(),
        data: { username: 'alice' },
      },
      {
        type: 'auth_failure',
        timestamp: now.toISOString(),
        data: { username: 'alice' },
      },
      {
        type: 'auth_failure',
        timestamp: now.toISOString(),
        data: { username: 'bob' },
      },
    ]

    const result = await executor.evaluateRule(rule, events)
    expect(result.status).toBe('triggered')
    expect(result.eventsCorrelated).toBe(2) // alice's group
    expect(result.description).toContain('alice')
  })

  it('filters out events outside the time window', async () => {
    const now = nowDate()
    const rule = {
      id: 'cor-4',
      name: 'Time Window Test',
      eventTypes: ['auth_failure'],
      threshold: 2,
      timeWindowMinutes: 5,
    }
    const events = [
      {
        type: 'auth_failure',
        timestamp: toDay(now.getTime() - 10 * 60 * 1000)
          .toDate()
          .toISOString(), // 10 min ago
        data: {},
      },
      { type: 'auth_failure', timestamp: now.toISOString(), data: {} },
    ]

    const result = await executor.evaluateRule(rule, events)
    expect(result.status).toBe('not_triggered')
    expect(result.eventsCorrelated).toBe(1) // only the recent one
  })

  it('filters out non-matching event types', async () => {
    const now = nowDate()
    const rule = {
      id: 'cor-5',
      name: 'Type Filter Test',
      eventTypes: ['auth_failure'],
      threshold: 2,
      timeWindowMinutes: 5,
    }
    const events = [
      { type: 'auth_failure', timestamp: now.toISOString(), data: {} },
      { type: 'auth_success', timestamp: now.toISOString(), data: {} },
      { type: 'dns_query', timestamp: now.toISOString(), data: {} },
    ]

    const result = await executor.evaluateRule(rule, events)
    expect(result.status).toBe('not_triggered')
    expect(result.eventsCorrelated).toBe(1)
  })

  it('includes timing information', async () => {
    const rule = {
      id: 'cor-6',
      name: 'Timing',
      eventTypes: ['test'],
      threshold: 100,
      timeWindowMinutes: 1,
    }

    const result = await executor.evaluateRule(rule, [])
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })
})
