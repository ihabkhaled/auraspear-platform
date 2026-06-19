import { describe, expect, it } from 'vitest'
import { IncidentStatus } from '@/enums'
import { buildIncidentStatusOptions } from '@/lib/incidents'

describe('incident status utilities', () => {
  it('includes the current status first followed by valid transitions', () => {
    expect(buildIncidentStatusOptions(IncidentStatus.IN_PROGRESS)).toEqual([
      IncidentStatus.IN_PROGRESS,
      IncidentStatus.CONTAINED,
      IncidentStatus.RESOLVED,
      IncidentStatus.CLOSED,
    ])
  })

  it('supports reopening closed incidents to open', () => {
    expect(buildIncidentStatusOptions(IncidentStatus.CLOSED)).toEqual([
      IncidentStatus.CLOSED,
      IncidentStatus.OPEN,
    ])
  })
})
