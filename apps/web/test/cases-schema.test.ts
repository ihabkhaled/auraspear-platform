import { describe, it, expect } from 'vitest'
import { CaseSeverity } from '@/enums'
import { createCaseSchema } from '@/lib/validation/cases.schema'

describe('createCaseSchema', () => {
  // ─── Valid inputs ─────────────────────────────────────────────

  it('should validate a minimal valid case (no optional fields)', () => {
    const input = {
      title: 'Alert investigation',
      description: 'Investigating suspicious network activity',
      severity: CaseSeverity.HIGH,
    }
    const result = createCaseSchema.safeParse(input)

    expect(result.success).toBe(true)
  })

  it('should validate with optional assignee', () => {
    const input = {
      title: 'Alert investigation',
      description: 'Investigating suspicious network activity',
      severity: CaseSeverity.MEDIUM,
      assignee: 'user-1',
    }
    const result = createCaseSchema.safeParse(input)

    expect(result.success).toBe(true)
  })

  it('should validate with optional cycleId as valid UUID', () => {
    const input = {
      title: 'Alert investigation',
      description: 'Investigating suspicious network activity',
      severity: CaseSeverity.LOW,
      cycleId: '550e8400-e29b-41d4-a716-446655440000',
    }
    const result = createCaseSchema.safeParse(input)

    expect(result.success).toBe(true)
  })

  it('should validate with all fields provided', () => {
    const input = {
      title: 'Full case creation',
      description: 'All fields are provided in this test case',
      severity: CaseSeverity.CRITICAL,
      assignee: 'analyst-42',
      cycleId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    }
    const result = createCaseSchema.safeParse(input)

    expect(result.success).toBe(true)
  })

  it('should validate without cycleId (undefined is acceptable for optional)', () => {
    const input = {
      title: 'No cycle case',
      description: 'This case is not assigned to any cycle',
      severity: CaseSeverity.HIGH,
      cycleId: undefined,
    }
    const result = createCaseSchema.safeParse(input)

    expect(result.success).toBe(true)
  })

  // ─── All severity levels ──────────────────────────────────────

  it('should accept all CaseSeverity values', () => {
    for (const severity of Object.values(CaseSeverity)) {
      const input = {
        title: 'Severity test',
        description: 'Testing each severity level',
        severity,
      }
      const result = createCaseSchema.safeParse(input)
      expect(result.success).toBe(true)
    }
  })

  // ─── Invalid inputs ──────────────────────────────────────────

  it('should reject when title is too short', () => {
    const input = {
      title: 'Hi',
      description: 'Valid description text here',
      severity: CaseSeverity.LOW,
    }
    const result = createCaseSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('should reject when description is too short', () => {
    const input = {
      title: 'Valid title',
      description: 'Short',
      severity: CaseSeverity.LOW,
    }
    const result = createCaseSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('should reject when severity is invalid', () => {
    const input = {
      title: 'Valid title',
      description: 'Valid description text here',
      severity: 'extreme',
    }
    const result = createCaseSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('should reject when title is missing', () => {
    const input = {
      description: 'Valid description text here',
      severity: CaseSeverity.LOW,
    }
    const result = createCaseSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('should reject when description is missing', () => {
    const input = {
      title: 'Valid title',
      severity: CaseSeverity.LOW,
    }
    const result = createCaseSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('should reject when severity is missing', () => {
    const input = {
      title: 'Valid title',
      description: 'Valid description text here',
    }
    const result = createCaseSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  // ─── cycleId validation ───────────────────────────────────────

  it('should reject cycleId when it is not a valid UUID', () => {
    const input = {
      title: 'Valid title',
      description: 'Valid description text here',
      severity: CaseSeverity.LOW,
      cycleId: 'not-a-uuid',
    }
    const result = createCaseSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('should reject cycleId when it is an empty string', () => {
    const input = {
      title: 'Valid title',
      description: 'Valid description text here',
      severity: CaseSeverity.LOW,
      cycleId: '',
    }
    const result = createCaseSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('should reject cycleId when it is a partial UUID', () => {
    const input = {
      title: 'Valid title',
      description: 'Valid description text here',
      severity: CaseSeverity.LOW,
      cycleId: '550e8400-e29b-41d4',
    }
    const result = createCaseSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  // ─── Edge cases ───────────────────────────────────────────────

  it('should accept title with exactly 5 characters (minimum)', () => {
    const input = {
      title: 'ABCDE',
      description: 'Valid description text here',
      severity: CaseSeverity.LOW,
    }
    const result = createCaseSchema.safeParse(input)

    expect(result.success).toBe(true)
  })

  it('should reject title with 4 characters (below minimum)', () => {
    const input = {
      title: 'ABCD',
      description: 'Valid description text here',
      severity: CaseSeverity.LOW,
    }
    const result = createCaseSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('should accept description with exactly 10 characters (minimum)', () => {
    const input = {
      title: 'Valid title',
      description: 'ABCDEFGHIJ',
      severity: CaseSeverity.LOW,
    }
    const result = createCaseSchema.safeParse(input)

    expect(result.success).toBe(true)
  })

  it('should reject description with 9 characters (below minimum)', () => {
    const input = {
      title: 'Valid title',
      description: 'ABCDEFGHI',
      severity: CaseSeverity.LOW,
    }
    const result = createCaseSchema.safeParse(input)

    expect(result.success).toBe(false)
  })
})
