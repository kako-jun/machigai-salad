'use client'

import { useEffect } from 'react'
import { useI18n } from '@/lib/i18n'
import { waitUntilIdle } from '@/lib/appBusy'

// Prevent SW update loop using timestamp (mirrors mypace's PWA update flow)
const SW_UPDATE_KEY = 'sw-update-time'
const COOLDOWN_MS = 10000 // 10 seconds cooldown after an update reload
const OVERLAY_DELAY_MS = 1500 // time the overlay is visible before triggering skipWaiting
const CONTROLLERCHANGE_FALLBACK_MS = 2000 // reload anyway if controllerchange never fires

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

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let cancelled = false

    // Called once the new worker has finished installing and is sitting in
    // `registration.waiting` (i.e. this is a real update, not the first
    // install — see the `navigator.serviceWorker.controller` check below).
    const applyUpdate = async (registration: ServiceWorkerRegistration) => {
      if (shouldSkipUpdate()) {
        console.info('SW update skipped (cooldown)')
        return
      }

      // Defer while the user is mid-task (corner adjustment / comparison /
      // GIF-video export / save) — a forced reload here would wipe unsaved
      // work. The overlay below also blocks further interaction once shown,
      // so there's no need to re-check busy after this point.
      await waitUntilIdle()
      if (cancelled) return

      console.info('New version available, reloading...')
      showUpdateOverlay(t('pwaUpdateRestarting'))
      sessionStorage.setItem(SW_UPDATE_KEY, Date.now().toString())

      // Set up the listener before triggering the switch-over.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })

      setTimeout(() => {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
        // Fallback: if controllerchange doesn't fire, reload anyway.
        setTimeout(() => {
          window.location.reload()
        }, CONTROLLERCHANGE_FALLBACK_MS)
      }, OVERLAY_DELAY_MS)
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Check for updates on registration.
        registration.update().catch((error) => {
          console.info('SW update check skipped:', error?.message || 'offline')
        })

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            // `installed` + an existing controller means this is an update
            // (not the page's first-ever SW install).
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              applyUpdate(registration)
            }
          })
        })
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error)
      })

    return () => {
      cancelled = true
    }
  }, [t])

  return null
}
