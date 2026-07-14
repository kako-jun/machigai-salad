'use client'

import { useEffect, useRef } from 'react'
import { useI18n } from '@/lib/i18n'
import { isAppBusy, waitUntilIdle } from '@/lib/appBusy'
import {
  detectExistingUpdate,
  watchInstallingWorker,
  makeIdleGatedOnce,
  type WorkerLike,
} from '@/lib/swUpdateDetection'

// Prevent SW update loop using timestamp (mirrors mypace's PWA update flow)
const SW_UPDATE_KEY = 'sw-update-time'
const COOLDOWN_MS = 10000 // 10 seconds cooldown after an update reload
const OVERLAY_DELAY_MS = 1500 // time the overlay is visible before triggering skipWaiting
const CONTROLLERCHANGE_FALLBACK_MS = 2000 // reload anyway if controllerchange never fires

// Module-level (not per-render) guard against concurrent applyUpdate() runs.
// `updatefound`/`statechange` can fire more than once for the same update
// (e.g. the effect re-registering listeners across re-renders, or the
// browser re-checking), and without this a second call could race the first
// while it's awaiting waitUntilIdle() — before the cooldown timestamp below
// is written — producing a duplicate overlay, duplicate SKIP_WAITING
// postMessage, duplicate controllerchange listener, and duplicate reload
// timers. Intentionally left `true` on the success path: a reload is about
// to blow away this module's state anyway. It's only reset on the
// `cancelled` bail-out, which does *not* reload.
let applying = false

function shouldSkipUpdate(): boolean {
  const lastUpdate = sessionStorage.getItem(SW_UPDATE_KEY)
  if (!lastUpdate) return false
  const elapsed = Date.now() - parseInt(lastUpdate, 10)
  return elapsed < COOLDOWN_MS
}

function showUpdateOverlay(message: string) {
  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(60, 36, 21, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
  `

  const messageEl = document.createElement('div')
  messageEl.style.cssText = `
    color: #fff8e7;
    font-size: 0.9rem;
    text-align: center;
    padding: 1.5rem 2rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    backdrop-filter: blur(10px);
  `
  messageEl.textContent = message

  overlay.appendChild(messageEl)
  document.body.appendChild(overlay)
}

export default function ServiceWorkerRegister() {
  const { t } = useI18n()

  // `t` is a useCallback keyed on `lang` (see lib/i18n.tsx) — its reference
  // changes whenever `lang` changes, e.g. the auto-detect effect flipping
  // 'ja' -> 'en' shortly after mount on the `/` (non-forcedLang) route. The
  // registration effect below must run exactly once per page load (see its
  // own comment for why depending on `t` there caused a silent update-drop
  // regression), so the current translator is threaded through a ref
  // instead of a dependency, and read via `tRef.current` at the one call
  // site that needs it (showUpdateOverlay).
  const tRef = useRef(t)
  useEffect(() => {
    tRef.current = t
  }, [t])

  // This effect must register the SW and attach its `updatefound` listener
  // exactly once per page load — hence the `[]` dependency array below.
  //
  // Regression (found in independent review of #51): this effect used to
  // depend on `[t]` so showUpdateOverlay could read the current
  // translation. But `t` (lib/i18n.tsx) is a useCallback keyed on `lang`,
  // so its reference changes whenever `lang` changes — e.g. the
  // client-side language auto-detect effect flipping 'ja' -> 'en' shortly
  // after mount on `/` (any non-forcedLang route, for a browser without
  // 'ja' in navigator.languages). That reference change re-ran this
  // effect. The cleanup below only sets `cancelled = true` — it never
  // called `registration.removeEventListener('updatefound', ...)` — so the
  // *first* (stale) run's listener stayed attached alongside the second
  // (live) run's listener, both on the same registration.
  //
  // When a real update later reached `installed`, both `watchInstallingWorker`
  // listeners fired synchronously for the same `statechange` event. The
  // module-level `applying` flag (see above) only guards against a
  // *second concurrent* run — it doesn't help here, because whichever
  // listener acquired `applying` first could be the *stale* (cancelled)
  // one: it sets `applying = true` synchronously, the live listener's call
  // synchronously no-ops via `if (applying) return`, and then the stale
  // listener resumes after `await waitUntilIdle()`, sees
  // `cancelled === true`, resets `applying = false`, and bails — with no
  // one left to retry. Net effect: the update was silently dropped, with
  // no error and no overlay, defeating the mount-time detection and
  // busy-regate work this file exists for. This file has no jsdom/RTL test
  // (vitest.config.ts is node-env, *.test.ts only) — see
  // ServiceWorkerRegister.test.ts for a source-shape regression guard.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let cancelled = false
    const hasController = () => Boolean(navigator.serviceWorker.controller)

    // Called once a new worker has finished installing and is sitting in
    // `waiting` (i.e. this is a real update, not the first install — see the
    // `hasController` check at each call site below).
    const applyUpdate = async (worker: WorkerLike) => {
      if (applying) return

      if (shouldSkipUpdate()) {
        console.info('SW update skipped (cooldown)')
        return
      }

      applying = true

      // Defer while the user is mid-task (corner adjustment / comparison /
      // GIF-video export / save) — a forced reload here would wipe unsaved
      // work.
      await waitUntilIdle()
      if (cancelled) {
        applying = false
        return
      }

      console.info('New version available, reloading...')
      showUpdateOverlay(tRef.current('pwaUpdateRestarting'))
      sessionStorage.setItem(SW_UPDATE_KEY, Date.now().toString())

      // The overlay covers the screen, but that only blocks pointer-driven
      // interaction — it doesn't blur focus or trap keyboard input, so a
      // control that was already focused before the overlay appeared can
      // still be activated (e.g. Enter/Space), and any async work already
      // in flight keeps running regardless of the overlay. So busy state can
      // still flip back to true during the pre-delay/fallback wait below.
      // makeIdleGatedOnce re-checks busy right before each point that would
      // actually reload/postMessage, and if busy, waits for the next idle
      // transition and retries instead of forcing it through — it also
      // guards against controllerchange and the fallback timer both firing
      // the reload.
      const reloadIfIdleElseDefer = makeIdleGatedOnce({
        isBusy: isAppBusy,
        waitUntilIdle,
        run: () => window.location.reload(),
      })

      // Set up the listener before triggering the switch-over.
      navigator.serviceWorker.addEventListener('controllerchange', reloadIfIdleElseDefer, {
        once: true,
      })

      setTimeout(() => {
        const sendSkipWaiting = makeIdleGatedOnce({
          isBusy: isAppBusy,
          waitUntilIdle,
          run: () => {
            worker.postMessage({ type: 'SKIP_WAITING' })
            // Fallback: if controllerchange doesn't fire, reload anyway.
            setTimeout(reloadIfIdleElseDefer, CONTROLLERCHANGE_FALLBACK_MS)
          },
        })
        sendSkipWaiting()
      }, OVERLAY_DELAY_MS)
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Catch an update that already finished installing (`waiting`) or
        // is mid-install (`installing`) *before* this effect ran — see
        // detectExistingUpdate's doc comment for why this is a normal
        // post-deploy-reload timing, not just a rare edge case.
        detectExistingUpdate(registration, hasController, (worker) => applyUpdate(worker))

        // Check for updates on registration.
        registration.update().catch((error) => {
          console.info('SW update check skipped:', error?.message || 'offline')
        })

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return
          watchInstallingWorker(newWorker, hasController, (worker) => applyUpdate(worker))
        })
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
