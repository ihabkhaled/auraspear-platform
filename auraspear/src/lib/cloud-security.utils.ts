import { StatusTextClass } from '@/enums'

/**
 * Returns a Tailwind color class for a compliance score percentage.
 * >= 80 = success (green), >= 50 = warning (yellow), < 50 = error (red).
 */
export function getComplianceScoreClass(score: number): string {
  if (score >= 80) {
    return StatusTextClass.SUCCESS
  }
  if (score >= 50) {
    return StatusTextClass.WARNING
  }
  return StatusTextClass.ERROR
}
