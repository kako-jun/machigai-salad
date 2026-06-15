import { describe, it, expect } from 'vitest'
import { formatSaveDate } from '@/lib/storage'

/**
 * Characterization tests for formatSaveDate — a pure date formatter.
 * It builds a `new Date(iso)` and formats the *local-time* components as
 * `YYYY-MM-DD HH:mm` (ISO-style, hyphen-separated) with zero-padded
 * month/day/hour/minute (year is NOT padded). The vitest config pins TZ=UTC
 * so local-time getters here equal the UTC wall-clock of the input, keeping
 * these assertions deterministic.
 *
 * Production code is unchanged by this suite.
 */
describe('formatSaveDate (TZ=UTC)', () => {
  it('formats a UTC ISO timestamp as YYYY-MM-DD HH:mm', () => {
    expect(formatSaveDate('2026-06-15T09:05:00.000Z')).toBe('2026-06-15 09:05')
  })

  it('zero-pads single-digit month, day, hour and minute', () => {
    expect(formatSaveDate('2026-01-02T03:04:00.000Z')).toBe('2026-01-02 03:04')
  })

  it('uses two-digit hours for afternoon times (24-hour clock)', () => {
    expect(formatSaveDate('2026-12-31T23:59:00.000Z')).toBe('2026-12-31 23:59')
  })

  it('does not pad the year', () => {
    // Year 999 stays three digits — pin the quirk that only M/D/H/m are padded.
    expect(formatSaveDate('0999-06-15T00:00:00.000Z')).toBe('999-06-15 00:00')
  })

  it('drops seconds and milliseconds', () => {
    expect(formatSaveDate('2026-06-15T09:05:59.789Z')).toBe('2026-06-15 09:05')
  })
})
