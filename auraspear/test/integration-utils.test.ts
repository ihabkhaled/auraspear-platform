import { describe, test, expect } from 'vitest'
import { IntegrationStatus } from '@/enums'
import { getStatusBorderClass } from '@/lib/integration-utils'

describe('getStatusBorderClass', () => {
  test('CONNECTED returns success border', () => {
    expect(getStatusBorderClass(IntegrationStatus.CONNECTED)).toBe('border-status-success/30')
  })

  test('ERROR returns error border', () => {
    expect(getStatusBorderClass(IntegrationStatus.ERROR)).toBe('border-status-error/30')
  })

  test('DISCONNECTED returns empty string', () => {
    expect(getStatusBorderClass(IntegrationStatus.DISCONNECTED)).toBe('')
  })
})
