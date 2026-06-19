import { NormalizationExecutor } from '../../src/modules/normalization/normalization.executor'
import type { NormalizationStep } from '../../src/modules/normalization/normalization.executor'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

describe('NormalizationExecutor', () => {
  let executor: NormalizationExecutor

  beforeEach(() => {
    jest.clearAllMocks()
    executor = new NormalizationExecutor(mockAppLogger as never)
  })

  it('renames fields', async () => {
    const pipeline = {
      id: 'pipe-1',
      name: 'Rename Test',
      steps: [
        { type: 'rename' as const, sourceField: 'src_ip', targetField: 'source_address' },
      ] satisfies NormalizationStep[],
    }
    const { normalizedEvents } = await executor.executePipeline(pipeline, [
      { src_ip: '10.0.0.1', msg: 'test' },
    ])
    expect(normalizedEvents[0]).toHaveProperty('source_address', '10.0.0.1')
    expect(normalizedEvents[0]).not.toHaveProperty('src_ip')
    expect(normalizedEvents[0]).toHaveProperty('msg', 'test')
  })

  it('maps field values', async () => {
    const pipeline = {
      id: 'pipe-2',
      name: 'Map Test',
      steps: [
        {
          type: 'map' as const,
          sourceField: 'level',
          targetField: 'severity',
          mapping: { '1': 'low', '5': 'medium', '10': 'high' },
        },
      ] satisfies NormalizationStep[],
    }
    const { normalizedEvents } = await executor.executePipeline(pipeline, [
      { level: '5', msg: 'test' },
    ])
    expect(normalizedEvents[0]).toHaveProperty('severity', 'medium')
  })

  it('drops events matching drop condition', async () => {
    const pipeline = {
      id: 'pipe-3',
      name: 'Drop Test',
      steps: [{ type: 'drop' as const, sourceField: 'debug' }] satisfies NormalizationStep[],
    }
    const { result, normalizedEvents } = await executor.executePipeline(pipeline, [
      { debug: true, msg: 'debug event' },
      { msg: 'normal event' },
    ])
    expect(normalizedEvents).toHaveLength(1)
    expect(result.droppedCount).toBe(1)
    expect(result.inputCount).toBe(2)
    expect(result.outputCount).toBe(1)
  })

  it('sets default values for missing fields', async () => {
    const pipeline = {
      id: 'pipe-4',
      name: 'Default Test',
      steps: [
        {
          type: 'default' as const,
          sourceField: 'severity',
          targetField: 'severity',
          defaultValue: 'info',
        },
      ] satisfies NormalizationStep[],
    }
    const { normalizedEvents } = await executor.executePipeline(pipeline, [{ msg: 'test' }])
    expect(normalizedEvents[0]).toHaveProperty('severity', 'info')
  })

  it('does not overwrite existing values with defaults', async () => {
    const pipeline = {
      id: 'pipe-5',
      name: 'Default No Overwrite',
      steps: [
        {
          type: 'default' as const,
          sourceField: 'severity',
          targetField: 'severity',
          defaultValue: 'info',
        },
      ] satisfies NormalizationStep[],
    }
    const { normalizedEvents } = await executor.executePipeline(pipeline, [
      { severity: 'critical', msg: 'test' },
    ])
    expect(normalizedEvents[0]).toHaveProperty('severity', 'critical')
  })

  it('extracts values using regex patterns', async () => {
    const pipeline = {
      id: 'pipe-6',
      name: 'Extract Test',
      steps: [
        {
          type: 'extract' as const,
          sourceField: 'message',
          targetField: 'ip_address',
          pattern: '(\\d+\\.\\d+\\.\\d+\\.\\d+)',
        },
      ] satisfies NormalizationStep[],
    }
    const { normalizedEvents } = await executor.executePipeline(pipeline, [
      { message: 'Connection from 192.168.1.100 on port 22' },
    ])
    expect(normalizedEvents[0]).toHaveProperty('ip_address', '192.168.1.100')
  })

  it('applies multiple steps in sequence', async () => {
    const pipeline = {
      id: 'pipe-7',
      name: 'Multi-step',
      steps: [
        { type: 'rename' as const, sourceField: 'src', targetField: 'source_ip' },
        {
          type: 'default' as const,
          sourceField: 'severity',
          targetField: 'severity',
          defaultValue: 'low',
        },
      ] satisfies NormalizationStep[],
    }
    const { normalizedEvents } = await executor.executePipeline(pipeline, [
      { src: '10.0.0.1', msg: 'test' },
    ])
    expect(normalizedEvents[0]).toHaveProperty('source_ip', '10.0.0.1')
    expect(normalizedEvents[0]).toHaveProperty('severity', 'low')
    expect(normalizedEvents[0]).not.toHaveProperty('src')
  })

  it('reports success status when no errors', async () => {
    const pipeline = {
      id: 'pipe-8',
      name: 'Status Test',
      steps: [] satisfies NormalizationStep[],
    }
    const { result } = await executor.executePipeline(pipeline, [{ msg: 'test' }])
    expect(result.status).toBe('success')
    expect(result.errors).toHaveLength(0)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })
})
