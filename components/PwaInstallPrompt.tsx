'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useI18n } from '@/lib/i18n'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'machigai-salad-pwa-dismissed'

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const eventRef = useRef<BeforeInstallPromptEvent | null>(null)
  const { t } = useI18n()

  const hide = useCallback(() => {
    setVisible(false)
    setDeferredPrompt(null)
    eventRef.current = null
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {}
  }, [])

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return
    } catch {}

    const handler = (e: Event) => {
      e.preventDefault()
      eventRef.current = e as BeforeInstallPromptEvent
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    const installedHandler = () => hide()

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [hide])

  if (!visible || !deferredPrompt) return null

  const handleInstall = async () => {
    const prompt = eventRef.current
    if (!prompt) return
    await prompt.prompt()
    await prompt.userChoice
    hide()
  }

  return (
    <div
      role="status"
      className="animate-fade-in fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-lg items-center gap-3 rounded-2xl px-5 py-3"
      style={{
        background: 'linear-gradient(145deg, #fffdf4, #fff8e7)',
        border: '1.5px solid var(--border)',
        boxShadow: '0 4px 20px rgba(60,36,21,0.18), 0 1px 3px rgba(60,36,21,0.1)',
      }}
    >
      <span className="flex-1 text-sm" style={{ color: 'var(--espresso)' }}>
        {t('installPrompt')}
      </span>
      <button
        onClick={handleInstall}
        className="btn-ghost whitespace-nowrap px-4 py-2 text-sm font-bold"
        style={{ color: 'var(--olive)' }}
      >
        {t('installBtn')}
      </button>
      <button
        onClick={hide}
        className="text-xs"
        style={{ color: 'var(--muted)', opacity: 0.7 }}
        aria-label={t('installDismiss')}
      >
        {t('installDismiss')}
      </button>
    </div>
  )
}
