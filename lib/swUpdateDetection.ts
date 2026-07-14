/**
 * Pure, DOM-independent helpers for detecting a pending Service Worker
 * update and gating the eventual reload on app-busy state.
 *
 * Pulled out of ServiceWorkerRegister.tsx (a 'use client' React component)
 * specifically so this logic is unit-testable under vitest's node
 * environment (see vitest.config.ts — node env, *.test.ts only, no DOM,
 * no .tsx). It's exactly the logic independent QA flagged twice on #51:
 *   1. a worker already `waiting`/`installing` at mount time (missed by only
 *      listening for future `updatefound` events)
 *   2. no busy re-check between the update overlay appearing and the actual
 *      reload (postMessage / controllerchange / fallback timer)
 */

export type WorkerLike = Pick<ServiceWorker, 'state' | 'addEventListener' | 'postMessage'>

// Declared against WorkerLike (not the real ServiceWorkerRegistration's
// `ServiceWorker | null` properties) so a plain mock object satisfying
// WorkerLike is directly assignable in tests, no `as unknown as` cast
// needed. A real ServiceWorkerRegistration is still structurally assignable
// here since a real ServiceWorker has everything WorkerLike requires.
interface RegistrationLike {
  readonly waiting: WorkerLike | null
  readonly installing: WorkerLike | null
}

/**
 * Watches a worker that's still installing and calls `onInstalled` once it
 * reaches `installed` while a controller already exists (i.e. it's an
 * update, not the page's first-ever SW install — a fresh install also
 * passes through `installed`, but with no prior controller to hand off
 * from).
 */
export function watchInstallingWorker(
  worker: WorkerLike,
  hasController: () => boolean,
  onInstalled: (worker: WorkerLike) => void
): void {
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && hasController()) {
      onInstalled(worker)
    }
  })
}

/**
 * Catches an update that already finished installing (`registration.waiting`)
 * or is mid-install (`registration.installing`) *before* the caller attaches
 * its `updatefound` listener.
 *
 * `updatefound` only fires at the moment a fresh install starts — it never
 * re-fires for a worker that's already past that point by the time a
 * listener is attached. The browser runs its own SW update check on
 * navigation, and that check can complete (reaching `waiting`, or starting
 * an `installing` in flight) before React hydration/useEffect gets this
 * far — a normal timing on an ordinary post-deploy reload, not a rare edge
 * case. Missing this means the update is silently dropped until some other
 * trigger fires `updatefound`.
 */
export function detectExistingUpdate(
  registration: RegistrationLike,
  hasController: () => boolean,
  onInstalled: (worker: WorkerLike) => void
): void {
  if (registration.waiting && hasController()) {
    onInstalled(registration.waiting)
  }
  if (registration.installing) {
    watchInstallingWorker(registration.installing, hasController, onInstalled)
  }
}

/**
 * Wraps `run` so it only fires once it's not busy, retrying on the next
 * idle transition if called while busy, and never runs more than once total
 * — safe to call from multiple triggers (e.g. both a `controllerchange`
 * listener and a fallback timer racing to reload) without double-firing.
 */
export function makeIdleGatedOnce(deps: {
  isBusy: () => boolean
  waitUntilIdle: () => Promise<void>
  run: () => void
}): () => void {
  let done = false
  const attempt = () => {
    if (done) return
    if (deps.isBusy()) {
      deps.waitUntilIdle().then(attempt)
      return
    }
    done = true
    deps.run()
  }
  return attempt
}
