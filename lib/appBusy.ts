/**
 * Global "is the user in the middle of something" flag.
 *
 * ImageProcessor reports whether the multi-step photo flow (corner
 * adjustment / comparison / GIF-video export / save) is active. The PWA
 * update handler (ServiceWorkerRegister) reads this to defer the
 * update-triggered reload until the user is back on the idle upload screen,
 * so an in-progress edit is never wiped out by a forced reload.
 */

let busy = false
let idleWaiters: Array<() => void> = []

export function setAppBusy(next: boolean) {
  busy = next
  if (!busy && idleWaiters.length > 0) {
    const toNotify = idleWaiters
    idleWaiters = []
    toNotify.forEach((resolve) => resolve())
  }
}

export function isAppBusy(): boolean {
  return busy
}

/** Resolves immediately if idle, otherwise resolves on the next transition to idle. */
export function waitUntilIdle(): Promise<void> {
  if (!busy) return Promise.resolve()
  return new Promise((resolve) => {
    idleWaiters.push(resolve)
  })
}
