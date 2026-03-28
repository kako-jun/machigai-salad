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
                ? 'linear-gradient(145deg, var(--error-bg), var(--error-bg-dark))'
                : 'linear-gradient(145deg, var(--surface), var(--cream))',
            border: `1px solid ${toast.type === 'error' ? 'var(--error-border)' : 'var(--border)'}`,
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
              lineHeight: 1,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {toast.type === 'error' ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--error)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--olive)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            )}
          </span>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.5,
              color: toast.type === 'error' ? 'var(--error)' : 'var(--espresso)',
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
