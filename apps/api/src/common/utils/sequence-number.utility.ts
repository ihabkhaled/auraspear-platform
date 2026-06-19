/**
 * Shared utility for generating sequential formatted numbers.
 *
 * Used by repositories that generate prefixed sequence numbers
 * (e.g. AP-2026-0001, SOC-2026-001, INC-2026-0001, DR-2026-0001).
 *
 * The advisory lock and Prisma query remain in the repository (data access);
 * this utility only handles the string parsing and formatting.
 */

/**
 * Given the last known value for a prefixed sequence, returns the next one.
 *
 * @param lastValue - The most recent sequence string found in the DB, or null/undefined if none exists.
 * @param prefix    - The full prefix including trailing separator (e.g. `"AP-2026-"`).
 * @param padLength - How many digits to zero-pad (e.g. 4 produces `"0001"`).
 * @returns The next formatted sequence string (e.g. `"AP-2026-0004"`).
 */
export function buildNextSequenceNumber(
  lastValue: string | null | undefined,
  prefix: string,
  padLength: number
): string {
  let nextNumber = 1

  if (lastValue) {
    const parts = lastValue.split('-')
    const lastSegment = parts[parts.length - 1]
    if (lastSegment) {
      const parsed = Number.parseInt(lastSegment, 10)
      if (!Number.isNaN(parsed)) {
        nextNumber = parsed + 1
      }
    }
  }

  return `${prefix}${String(nextNumber).padStart(padLength, '0')}`
}
