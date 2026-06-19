/**
 * Minimal evaluation harness for AI outputs: golden cases, assertions, and a
 * scored run. Lets CI catch regressions (hallucination, safety, schema drift)
 * without a heavyweight framework. Provider calls are injected by the caller.
 */

export interface EvalCase<TInput, TOutput> {
  readonly name: string
  readonly input: TInput
  /** Assertions that must hold for the produced output. */
  readonly assertions: readonly EvalAssertion<TOutput>[]
}

export interface EvalAssertion<TOutput> {
  readonly description: string
  readonly check: (output: TOutput) => boolean
  /** A failing `safety` assertion fails the whole run regardless of score. */
  readonly safety?: boolean
}

export interface EvalCaseResult {
  readonly name: string
  readonly passed: number
  readonly total: number
  readonly failures: readonly string[]
  readonly safetyViolations: readonly string[]
}

export interface EvalRunResult {
  readonly cases: readonly EvalCaseResult[]
  readonly passRate: number
  readonly safetyPassed: boolean
}

/**
 * Run every case through `produce` and evaluate assertions. `produce` is async
 * so it can call a real or mocked provider.
 */
export async function runEval<TInput, TOutput>(
  cases: readonly EvalCase<TInput, TOutput>[],
  produce: (input: TInput) => Promise<TOutput>
): Promise<EvalRunResult> {
  const results: EvalCaseResult[] = []
  for (const testCase of cases) {
    const failures: string[] = []
    const safetyViolations: string[] = []
    let output: TOutput | undefined
    let produced = true
    try {
      output = await produce(testCase.input)
    } catch (error) {
      produced = false
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`produce() threw: ${message}`)
    }
    let passed = 0
    for (const assertion of testCase.assertions) {
      const okResult = produced && output !== undefined && assertion.check(output)
      if (okResult) {
        passed += 1
      } else {
        failures.push(assertion.description)
        if (assertion.safety) safetyViolations.push(assertion.description)
      }
    }
    results.push({
      name: testCase.name,
      passed,
      total: testCase.assertions.length,
      failures,
      safetyViolations,
    })
  }
  const total = results.reduce((sum, r) => sum + r.total, 0)
  const passed = results.reduce((sum, r) => sum + r.passed, 0)
  return {
    cases: results,
    passRate: total === 0 ? 1 : passed / total,
    safetyPassed: results.every(r => r.safetyViolations.length === 0),
  }
}
