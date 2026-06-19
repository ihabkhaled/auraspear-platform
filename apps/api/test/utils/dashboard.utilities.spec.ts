import { toDay } from '../../src/common/utils/date-time.utility'
import {
  buildRulePerformanceEntries,
  calculateFalsePositiveRate,
} from '../../src/modules/dashboards/dashboards.utilities'
import type { DetectionRulePerformanceRow } from '../../src/modules/dashboards/dashboards.types'

describe('dashboard utilities', () => {
  describe('calculateFalsePositiveRate', () => {
    it('returns 0 when both hitCount and falsePositiveCount are zero', () => {
      expect(calculateFalsePositiveRate(0, 0)).toBe(0)
    })

    it('returns 100 when hitCount is zero but falsePositiveCount is positive', () => {
      expect(calculateFalsePositiveRate(0, 5)).toBe(100)
    })

    it('calculates percentage to one decimal place', () => {
      expect(calculateFalsePositiveRate(100, 25)).toBe(25)
      expect(calculateFalsePositiveRate(1234, 23)).toBe(1.9)
    })
  })

  describe('buildRulePerformanceEntries', () => {
    const now = toDay('2026-03-18T10:00:00.000Z').toDate()

    const baseRow: DetectionRulePerformanceRow = {
      id: 'rule-1',
      name: 'Failed Login Threshold',
      hitCount: 1234,
      falsePositiveCount: 23,
      lastTriggeredAt: now,
      createdAt: now,
    }

    it('maps rows to entries with calculated false positive rate', () => {
      const entries = buildRulePerformanceEntries([baseRow])

      expect(entries).toHaveLength(1)
      expect(entries[0]).toMatchObject({
        id: 'rule-1',
        name: 'Failed Login Threshold',
        hitCount: 1234,
        falsePositiveCount: 23,
        falsePositiveRate: 1.9,
        createdAt: now,
      })
    })

    it('returns empty array for empty input', () => {
      expect(buildRulePerformanceEntries([])).toEqual([])
    })

    it('preserves order of rules', () => {
      const rows: DetectionRulePerformanceRow[] = [
        {
          id: 'r-1',
          name: 'Rule A',
          hitCount: 100,
          falsePositiveCount: 10,
          lastTriggeredAt: null,
          createdAt: now,
        },
        {
          id: 'r-2',
          name: 'Rule B',
          hitCount: 80,
          falsePositiveCount: 5,
          lastTriggeredAt: null,
          createdAt: now,
        },
        {
          id: 'r-3',
          name: 'Rule C',
          hitCount: 50,
          falsePositiveCount: 2,
          lastTriggeredAt: null,
          createdAt: now,
        },
      ]

      const entries = buildRulePerformanceEntries(rows)

      expect(entries).toHaveLength(3)
      expect(entries.map(e => e.name)).toEqual(['Rule A', 'Rule B', 'Rule C'])
    })

    it('includes all performance metrics for each entry', () => {
      const entries = buildRulePerformanceEntries([
        {
          id: 'r-1',
          name: 'High FP Rule',
          hitCount: 100,
          falsePositiveCount: 80,
          lastTriggeredAt: null,
          createdAt: now,
        },
      ])

      expect(entries[0]).toEqual({
        id: 'r-1',
        name: 'High FP Rule',
        hitCount: 100,
        falsePositiveCount: 80,
        falsePositiveRate: 80,
        lastTriggeredAt: null,
        createdAt: now,
      })
    })
  })
})
