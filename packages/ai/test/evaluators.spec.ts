import { describe, it, expect } from 'vitest'
import { runEval, type EvalCase } from '../src/evaluators.ts'

interface Out {
  readonly value: number
}

function evalCase(
  name: string,
  assertions: EvalCase<number, Out>['assertions']
): EvalCase<number, Out> {
  return { name, input: 1, assertions }
}

describe('runEval', () => {
  it('reports passRate 1 and safetyPassed when all assertions hold', async () => {
    const cases = [
      evalCase('a', [{ description: 'positive', check: o => o.value > 0 }]),
      evalCase('b', [{ description: 'even', check: o => o.value % 2 === 0 }]),
    ]
    const result = await runEval(cases, async input => ({ value: input * 2 }))
    expect(result.passRate).toBe(1)
    expect(result.safetyPassed).toBe(true)
    expect(result.cases).toHaveLength(2)
    expect(result.cases[0]?.passed).toBe(1)
  })

  it('computes a fractional passRate and records failures', async () => {
    const cases = [
      evalCase('mixed', [
        { description: 'too big', check: o => o.value > 100 },
        { description: 'is two', check: o => o.value === 2 },
      ]),
    ]
    const result = await runEval(cases, async input => ({ value: input * 2 }))
    expect(result.passRate).toBe(0.5)
    expect(result.cases[0]?.failures).toContain('too big')
  })

  it('flags safety violations and fails the whole run', async () => {
    const cases = [
      evalCase('safety', [{ description: 'no secret leaked', check: () => false, safety: true }]),
    ]
    const result = await runEval(cases, async () => ({ value: 0 }))
    expect(result.safetyPassed).toBe(false)
    expect(result.cases[0]?.safetyViolations).toContain('no secret leaked')
  })

  it('marks every assertion failed when produce() throws', async () => {
    const cases = [
      evalCase('boom', [
        { description: 'a', check: () => true },
        { description: 'b', check: () => true, safety: true },
      ]),
    ]
    const result = await runEval(cases, async () => {
      throw new Error('provider down')
    })
    expect(result.passRate).toBe(0)
    expect(result.cases[0]?.failures).toContain('produce() threw: provider down')
    expect(result.cases[0]?.safetyViolations).toContain('b')
  })

  it('handles a non-Error throw from produce()', async () => {
    const cases = [evalCase('strthrow', [{ description: 'a', check: () => true }])]
    const result = await runEval(cases, async () => {
      throw 'string failure'
    })
    expect(result.cases[0]?.failures.some(f => f.includes('string failure'))).toBe(true)
  })

  it('returns passRate 1 for an empty case list (no assertions to fail)', async () => {
    const result = await runEval([], async (x: number) => ({ value: x }))
    expect(result.passRate).toBe(1)
    expect(result.safetyPassed).toBe(true)
    expect(result.cases).toHaveLength(0)
  })
})
