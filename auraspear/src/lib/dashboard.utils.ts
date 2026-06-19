import type { NextRequest } from 'next/server'
import {
  DashboardDensity,
  GapClass,
  GridColsClass,
  StackClass,
  StatusBgClass,
  StatusBorderClass,
  StatusTextClass,
} from '@/enums'
import type { DashboardPanelKey } from '@/enums'
import { fetchBackendJson } from '@/lib/backend-proxy'
import {
  DASHBOARD_DENSITY_STORAGE_KEY,
  DEFAULT_COLLAPSED_DASHBOARD_PANELS,
  DEFAULT_DASHBOARD_DENSITY,
} from '@/lib/constants/dashboard-preferences'
import type { DashboardPanelState, UserPreferences } from '@/types'

const PERCENTAGE_FALLBACK = 'N/A'

export function getRiskBadgeClass(score: number): string {
  if (score > 80) {
    return `${StatusBgClass.ERROR} ${StatusTextClass.ERROR} ${StatusBorderClass.ERROR}`
  }
  if (score > 60) {
    return `${StatusBgClass.WARNING} ${StatusTextClass.WARNING} ${StatusBorderClass.WARNING}`
  }
  if (score > 40) {
    return `${StatusBgClass.INFO} ${StatusTextClass.INFO} ${StatusBorderClass.INFO}`
  }
  return `${StatusBgClass.NEUTRAL} ${StatusTextClass.NEUTRAL} ${StatusBorderClass.NEUTRAL}`
}

export function getDashboardCardGridClass(count: number): string {
  if (count <= 1) {
    return GridColsClass.COLS_1
  }

  if (count === 2) {
    return GridColsClass.COLS_1_SM2
  }

  if (count === 3) {
    return GridColsClass.COLS_1_SM2_XL3
  }

  if (count === 4) {
    return GridColsClass.COLS_1_SM2_XL4
  }

  if (count === 5) {
    return GridColsClass.COLS_1_SM2_LG3_XL5
  }

  if (count === 6) {
    return GridColsClass.COLS_1_SM2_LG3_XL6
  }

  if (count === 7) {
    return GridColsClass.COLS_1_SM2_LG4_XL7
  }

  return GridColsClass.COLS_1_SM2_LG4_XL8
}

export function formatDashboardPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return PERCENTAGE_FALLBACK
  }

  return `${value}%`
}

export function getDashboardGapClass(density: DashboardDensity): string {
  switch (density) {
    case DashboardDensity.COMPACT:
      return GapClass.GAP_4
    case DashboardDensity.EXPANDED:
      return GapClass.GAP_8
    default:
      return GapClass.GAP_6
  }
}

export function getDashboardStackClass(density: DashboardDensity): string {
  switch (density) {
    case DashboardDensity.COMPACT:
      return StackClass.SPACE_Y_4
    case DashboardDensity.EXPANDED:
      return StackClass.SPACE_Y_8
    default:
      return StackClass.SPACE_Y_6
  }
}

export function buildDashboardPanelState(
  preferences: UserPreferences | undefined
): DashboardPanelState {
  return {
    density: preferences?.dashboardDensity ?? DEFAULT_DASHBOARD_DENSITY,
    collapsed: preferences?.collapsedDashboardPanels ?? DEFAULT_COLLAPSED_DASHBOARD_PANELS,
  }
}

export function isDashboardPanelOpen(
  collapsedPanels: DashboardPanelKey[],
  panelKey: DashboardPanelKey
): boolean {
  return !collapsedPanels.includes(panelKey)
}

export function toggleDashboardPanelPreference(
  collapsedPanels: DashboardPanelKey[],
  panelKey: DashboardPanelKey,
  open: boolean
): DashboardPanelKey[] {
  if (open) {
    return collapsedPanels.filter(key => key !== panelKey)
  }

  if (collapsedPanels.includes(panelKey)) {
    return collapsedPanels
  }

  return [...collapsedPanels, panelKey]
}

export function isDashboardDensity(value: string | null): value is DashboardDensity {
  return value !== null && Object.values(DashboardDensity).includes(value as DashboardDensity)
}

export function readStoredDashboardDensity(): DashboardDensity | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const value = window.localStorage.getItem(DASHBOARD_DENSITY_STORAGE_KEY)
    return isDashboardDensity(value) ? value : null
  } catch {
    return null
  }
}

export function persistDashboardDensity(density: DashboardDensity): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(DASHBOARD_DENSITY_STORAGE_KEY, density)
  } catch {
    // Ignore storage failures and keep the in-memory preference.
  }
}

export async function fetchStatsSafe<T>(
  request: NextRequest,
  path: string,
  fallback: T
): Promise<T> {
  try {
    const { data } = await fetchBackendJson(request, path)
    const result = data as T
    return result ?? fallback
  } catch {
    return fallback
  }
}
