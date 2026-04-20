export type LineEnv = 'android' | 'ios' | null

/**
 * Detects whether the given UA string is LINE's in-app browser,
 * and returns the OS variant when applicable.
 *
 * - 'android': LINE in-app browser on Android (supports ?openExternalBrowser=1)
 * - 'ios': LINE in-app browser on iOS (needs manual "Open in Safari")
 * - null: not LINE in-app, or LINE on an unsupported platform (e.g. desktop)
 */
export function detectLineInApp(ua: string): LineEnv {
  // LINE official UA: "Line/14.5.0 ..." — require Line/ followed immediately by a digit
  // to exclude lookalikes such as "LineFor業務" or vendor strings that contain "Line".
  if (!/(?:^|\s)Line\/\d/i.test(ua)) return null
  if (/Android/i.test(ua)) return 'android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  return null
}
