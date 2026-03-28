'use client'

import { useRef } from 'react'
import { useI18n } from '@/lib/i18n'
import { showToast } from './Toast'

type LoadState = 'loading' | 'ready' | 'error'

interface ImageUploadProps {
  onImageUpload: (imageDataUrl: string) => void
  cvLoaded: boolean
  loadState: LoadState
  loadError: string | null
  onRetry: () => void
  saveCount?: number
  onOpenSaves?: () => void
}

export default function ImageUpload({
  onImageUpload,
  cvLoaded,
  loadState,
  loadError,
  onRetry,
  saveCount,
  onOpenSaves,
}: ImageUploadProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const { t } = useI18n()

  const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      showToast(t('imageTooBig'), 'error')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageDataUrl = event.target?.result as string
      onImageUpload(imageDataUrl)
    }
    reader.onerror = () => {
      showToast(t('loadFailed'), 'error')
    }
    reader.readAsDataURL(file)
  }

  const handleCameraClick = () => {
    cameraInputRef.current?.click()
  }

  const handleGalleryClick = () => {
    galleryInputRef.current?.click()
  }

  return (
    <div className="animate-fade-in flex flex-col items-center py-10">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={!cvLoaded}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={!cvLoaded}
      />

      {/* Outer placemat panel */}
      <div
        className="flex w-full flex-col items-center gap-5 rounded-2xl px-8 py-10"
        style={{
          background: 'linear-gradient(160deg, #FFFDF4 0%, #FFF8E7 50%, #FDF3D8 100%)',
          border: '2px solid var(--border)',
          boxShadow:
            '0 1px 0 rgba(255,255,255,0.9) inset, 0 -1px 0 rgba(180,130,60,0.2) inset, 0 4px 16px rgba(60,36,21,0.1), 0 1px 3px rgba(60,36,21,0.07)',
        }}
      >
        <div
          className="menu-stripe mb-3"
          style={{ marginLeft: '-1.5rem', marginRight: '-1.5rem' }}
        />

        {loadState === 'error' ? (
          /* Error state with retry */
          <div className="flex flex-col items-center gap-4 px-4 py-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                background: 'linear-gradient(145deg, var(--error-bg), var(--error-bg-dark))',
                border: '2px solid var(--error-border)',
                boxShadow: '0 2px 8px rgba(60,36,21,0.12)',
              }}
            >
              <svg
                width="28"
                height="28"
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
            </div>

            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: 'var(--error)' }}>
                {t('loadFailed')}
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                {t('checkNetwork')}
              </p>
            </div>

            <button onClick={onRetry} className="btn-action px-8 py-3 text-sm">
              {t('retryLoad')}
            </button>
          </div>
        ) : (
          /* Normal state: loading or ready */
          <>
            {/* Camera shutter button */}
            <button
              onClick={handleCameraClick}
              disabled={!cvLoaded}
              className="btn-shutter flex flex-col items-center gap-4 px-10 py-8"
            >
              {cvLoaded ? (
                <CameraIcon />
              ) : (
                <div
                  className="animate-spin-smooth h-12 w-12 rounded-full"
                  style={{
                    border: '3px solid rgba(60,36,21,0.15)',
                    borderTopColor: 'var(--accent)',
                    borderRightColor: 'var(--golden)',
                  }}
                />
              )}

              <span
                className="text-base font-bold tracking-wide"
                style={{ color: 'var(--espresso)' }}
              >
                {cvLoaded ? t('takePhoto') : t('preparing')}
              </span>
            </button>

            {/* Gallery + Saves group — visually equidistant from camera */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleGalleryClick}
                disabled={!cvLoaded}
                className="flex items-center gap-1.5 py-2 transition-opacity hover:opacity-70"
                style={{ color: 'var(--muted)' }}
              >
                <GalleryIcon />
                <span className="text-sm">{t('pickFromAlbum')}</span>
              </button>

              {saveCount != null && saveCount > 0 && onOpenSaves && (
                <button
                  onClick={onOpenSaves}
                  className="flex items-center gap-1.5 py-2 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--muted)' }}
                >
                  <SaveIcon />
                  <span className="text-sm">
                    {t('savedList')} ({saveCount})
                  </span>
                </button>
              )}
            </div>

            {/* Instruction text styled like menu footnote */}
            <div
              className="rounded-xl px-4 py-2.5 text-center"
              style={{
                background: 'rgba(245,197,24,0.12)',
                border: '1px solid rgba(212,160,16,0.3)',
              }}
            >
              <p
                className="whitespace-pre-line text-sm leading-relaxed"
                style={{ color: 'var(--muted)' }}
              >
                {t('shootStraight')}
              </p>
            </div>
          </>
        )}

        <div
          className="menu-stripe mt-3"
          style={{ marginLeft: '-1.5rem', marginRight: '-1.5rem' }}
        />
      </div>
    </div>
  )
}

export function SaveIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}

function GalleryIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <div
      className="flex items-center justify-center rounded-full"
      style={{
        width: 64,
        height: 64,
        background:
          'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5) 0%, transparent 60%), linear-gradient(145deg, #FFF8E7, #D4A810)',
        border: '2px solid #8B6B20',
        boxShadow: '0 1px 0 rgba(255,255,255,0.5) inset, 0 2px 8px rgba(60,36,21,0.2)',
      }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--espresso)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.85 }}
      >
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    </div>
  )
}
