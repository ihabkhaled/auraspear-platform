import { describe, expect, it } from 'vitest'
import { DashboardDensity, DashboardPanelKey } from '@/enums'
import {
  buildDashboardPanelState,
  formatDashboardPercentage,
  getDashboardCardGridClass,
  getDashboardGapClass,
  getDashboardStackClass,
  isDashboardPanelOpen,
  toggleDashboardPanelPreference,
} from '@/lib/dashboard.utils'

describe('dashboard utils', () => {
  it('formats missing percentages as N/A', () => {
    expect(formatDashboardPercentage(undefined)).toBe('N/A')
    expect(formatDashboardPercentage(null)).toBe('N/A')
    expect(formatDashboardPercentage(87)).toBe('87%')
  })

  it('returns full-row grid classes for medium and dense KPI card counts', () => {
    expect(getDashboardCardGridClass(4)).toContain('xl:grid-cols-4')
    expect(getDashboardCardGridClass(5)).toContain('xl:grid-cols-5')
    expect(getDashboardCardGridClass(8)).toContain('xl:grid-cols-8')
  })

  it('builds dashboard panel state from preferences and defaults', () => {
    expect(buildDashboardPanelState(undefined)).toEqual({
      density: DashboardDensity.COMFORTABLE,
      collapsed: [DashboardPanelKey.MITRE_TECHNIQUES, DashboardPanelKey.TARGETED_ASSETS],
    })

    expect(
      buildDashboardPanelState({
        theme: 'system',
        language: 'en',
        dashboardDensity: DashboardDensity.COMPACT,
        collapsedDashboardPanels: [DashboardPanelKey.OVERVIEW],
      })
    ).toEqual({
      density: DashboardDensity.COMPACT,
      collapsed: [DashboardPanelKey.OVERVIEW],
    })
  })

  it('resolves gap classes for density modes', () => {
    expect(getDashboardGapClass(DashboardDensity.COMPACT)).toBe('gap-4')
    expect(getDashboardGapClass(DashboardDensity.COMFORTABLE)).toBe('gap-6')
    expect(getDashboardGapClass(DashboardDensity.EXPANDED)).toBe('gap-8')
  })

  it('resolves stack classes for density modes', () => {
    expect(getDashboardStackClass(DashboardDensity.COMPACT)).toBe('space-y-4')
    expect(getDashboardStackClass(DashboardDensity.COMFORTABLE)).toBe('space-y-6')
    expect(getDashboardStackClass(DashboardDensity.EXPANDED)).toBe('space-y-8')
  })

  it('toggles panel open state without duplicating collapsed keys', () => {
    const collapsedPanels = [DashboardPanelKey.OVERVIEW]

    expect(isDashboardPanelOpen(collapsedPanels, DashboardPanelKey.OVERVIEW)).toBe(false)
    expect(isDashboardPanelOpen(collapsedPanels, DashboardPanelKey.AUTOMATION)).toBe(true)
    expect(
      toggleDashboardPanelPreference(collapsedPanels, DashboardPanelKey.OVERVIEW, true)
    ).toEqual([])
    expect(
      toggleDashboardPanelPreference(collapsedPanels, DashboardPanelKey.AUTOMATION, false)
    ).toEqual([DashboardPanelKey.OVERVIEW, DashboardPanelKey.AUTOMATION])
    expect(
      toggleDashboardPanelPreference(collapsedPanels, DashboardPanelKey.OVERVIEW, false)
    ).toEqual([DashboardPanelKey.OVERVIEW])
  })
})
