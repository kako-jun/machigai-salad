'use client'

import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/lib/i18n'

export interface ToastMessage {
  id: number
  text: string
  type: 'error' | 'info'
}

let toastId = 0
let globalAddToast: ((text: string, type: 'error' | 'info') => void) | null = null

/**
 * Show a toast notification from anywhere.
 * The ToastContainer must be mounted for this to work.
 */
export function showToast(text: string, type: 'error' | 'info' = 'error') {
  if (globalAddToast) {
    globalAddToast(text, type)
  } else {
    // Fallback: if container not mounted yet, log to console
    console.warn('[Toast not mounted]', text)
  }
}

const TOAST_DURATION_MS = 5000

/**
 * Toast container — mount once at the app level.
 * Displays stacked toast notifications that auto-dismiss.
 */
export default function ToastContainer() {
  const { t } = useI18n()
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((text: string, type: 'error' | 'info') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, text, type }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, TOAST_DURATION_MS)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Register global access
  useEffect(() => {
    globalAddToast = addToast
    return () => {
      globalAddToast = null
    }
  }, [addToast])

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '90%',
        maxWidth: 400,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-fade-in"
          style={{
            pointerEvents: 'auto',
            background:
              toast.type === 'error'
                ? 'linear-gradient(145deg, #FFF0EC, #FFE4DC)'
                : 'linear-gradient(145deg, #FFFDF4, #FFF8E7)',
            border: `1px solid ${toast.type === 'error' ? '#D4885A' : 'var(--border)'}`,
            borderRadius: 12,
            padding: '12px 16px',
            boxShadow: '0 4px 16px rgba(60,36,21,0.15), 0 1px 3px rgba(60,36,21,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
          onClick={() => removeToast(toast.id)}
          role="alert"
        >
          <span
            style={{
              fontSize: 18,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            {toast.type === 'error' ? '\u26A0' : '\u2139'}
          </span>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.5,
              color: toast.type === 'error' ? '#8B3E1A' : 'var(--espresso)',
              flex: 1,
            }}
          >
            {toast.text}
          </p>
          <button
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 12px',
              cursor: 'pointer',
              color: 'var(--muted)',
              fontSize: 16,
              lineHeight: 1,
              flexShrink: 0,
              opacity: 0.6,
            }}
            onClick={(e) => {
              e.stopPropagation()
              removeToast(toast.id)
            }}
            aria-label={t('toastClose')}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  )
}
