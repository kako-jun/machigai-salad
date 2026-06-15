import { describe, it, expect } from 'vitest'
import { detectLineInApp } from '@/lib/detectLineInApp'

/**
 * Characterization tests for detectLineInApp.
 * These pin the *current* behaviour of the UA-parsing logic, including its
 * quirks. The implementation is not changed by this suite.
 *
 * Rules pinned (see source):
 *   - Must match `Line/<digit>` (case-insensitive) preceded by start-of-string
 *     or whitespace, else returns null.
 *   - If it is LINE and UA contains "Android" -> 'android'.
 *   - Else if it contains iPhone|iPad|iPod -> 'ios'.
 *   - Otherwise (e.g. LINE desktop) -> null.
 */
describe('detectLineInApp', () => {
  describe('LINE Android', () => {
    it('detects a typical LINE Android UA', () => {
      const ua =
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Line/14.5.0/IAB'
      expect(detectLineInApp(ua)).toBe('android')
    })

    it('detects LINE Android when Line/ is at the very start', () => {
      expect(detectLineInApp('Line/14.5.0 Android')).toBe('android')
    })

    it('is case-insensitive on the Line token and the Android token', () => {
      expect(detectLineInApp('foo line/9 ANDROID bar')).toBe('android')
    })
  })

  describe('LINE iOS', () => {
    it('detects a typical LINE iPhone UA', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Line/14.5.0'
      expect(detectLineInApp(ua)).toBe('ios')
    })

    it('detects LINE on iPad', () => {
      expect(detectLineInApp('Line/14.0 (iPad; CPU OS 17_0)')).toBe('ios')
    })

    it('detects LINE on iPod', () => {
      expect(detectLineInApp('Line/14.0 (iPod touch)')).toBe('ios')
    })
  })

  describe('Android takes precedence over iOS tokens', () => {
    it('returns android when both Android and iPhone appear (Android checked first)', () => {
      // Quirk pinned: Android is tested before the iPhone/iPad/iPod branch,
      // so a UA mentioning both resolves to 'android'.
      expect(detectLineInApp('Line/14.0 Android iPhone')).toBe('android')
    })
  })

  describe('LINE on unsupported platform', () => {
    it('returns null for LINE desktop (no Android / iOS token)', () => {
      expect(detectLineInApp('Line/7.0.0 (Macintosh; Desktop)')).toBe(null)
    })
  })

  describe('not LINE in-app', () => {
    it('returns null for a plain Chrome UA', () => {
      const ua =
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      expect(detectLineInApp(ua)).toBe(null)
    })

    it('returns null for lookalike "LineFor..." strings (no digit after Line/)', () => {
      // The regex requires Line/ followed immediately by a digit.
      expect(detectLineInApp('LineForBusiness/abc Android')).toBe(null)
    })

    it('returns null when "Line" is not followed by a slash+digit', () => {
      expect(detectLineInApp('SomeLineApp Android')).toBe(null)
    })

    it('returns null when "Line/" is mid-token without a preceding boundary', () => {
      // "xLine/14" has no start-or-whitespace boundary before Line.
      expect(detectLineInApp('xLine/14 Android')).toBe(null)
    })

    it('returns null for an empty UA', () => {
      expect(detectLineInApp('')).toBe(null)
    })
  })
})
