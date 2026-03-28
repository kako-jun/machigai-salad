'use client'

import { useCallback, useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'
import { showToast } from './Toast'

const APP_URL = 'https://machigai-salad.llll-ll.com'

export default function ShareButtons() {
  const { t } = useI18n()
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share)
  }, [])

  const shareText = t('shareText')

  const handleX = useCallback(() => {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(APP_URL)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [shareText])

  const handleLine = useCallback(() => {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(APP_URL)}&text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [shareText])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(APP_URL)
      showToast(t('copied'), 'info')
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = APP_URL
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      showToast(t('copied'), 'info')
    }
  }, [t])

  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({ title: t('shareText'), url: APP_URL })
    } catch {
      // User cancelled — no action needed
    }
  }, [t])

  const btnStyle: React.CSSProperties = {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    border: '1px solid var(--border-light)',
    background: 'var(--parchment)',
    color: 'var(--espresso-light)',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs" style={{ color: 'var(--muted)' }}>
        {t('shareApp')}
      </span>
      <div className="flex items-center gap-2">
        {/* X (Twitter) */}
        <button onClick={handleX} style={btnStyle} aria-label="Share on X">
          <XIcon />
        </button>

        {/* LINE */}
        <button onClick={handleLine} style={btnStyle} aria-label="Share on LINE">
          <LineIcon />
        </button>

        {/* Native share on supported devices, clipboard copy as fallback */}
        {canShare ? (
          <button onClick={handleNativeShare} style={btnStyle} aria-label="Share">
            <ShareIcon />
          </button>
        ) : (
          <button onClick={handleCopy} style={btnStyle} aria-label="Copy link">
            <ClipboardIcon />
          </button>
        )}
      </div>
    </div>
  )
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function LineIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}
