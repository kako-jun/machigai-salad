'use client'

import { useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { showToast } from './Toast'
import { SaveIcon } from './icons'

type LoadState = 'loading' | 'ready' | 'error'

interface ImageUploadProps {
  onImageUpload: (imageDataUrl: string) => void
  onTwoImageUpload: (left: string, right: string) => void
  cvLoaded: boolean
  loadState: LoadState
  loadError: string | null
  onRetry: () => void
  saveCount?: number
  onOpenSaves?: () => void
}

export default function ImageUpload({
  onImageUpload,
  onTwoImageUpload,
  cvLoaded,
  loadState,
  loadError,
  onRetry,
  saveCount,
  onOpenSaves,
}: ImageUploadProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const firstImageInputRef = useRef<HTMLInputElement>(null)
  const secondImageInputRef = useRef<HTMLInputElement>(null)
  const { t } = useI18n()

  const [albumPopupOpen, setAlbumPopupOpen] = useState(false)
  const [firstImageData, setFirstImageData] = useState<string | null>(null)

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

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        resolve(event.target?.result as string)
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  const handleFirstImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.size > MAX_FILE_SIZE) {
      showToast(t('imageTooBig'), 'error')
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setFirstImageData(dataUrl)
      showToast(t('pickSecondImage'), 'info')
      setTimeout(() => {
        secondImageInputRef.current?.click()
      }, 300)
    } catch {
      showToast(t('loadFailed'), 'error')
    }
  }

  const handleSecondImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.size > MAX_FILE_SIZE) {
      showToast(t('imageTooBig'), 'error')
      setFirstImageData(null)
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      if (firstImageData) {
        onTwoImageUpload(firstImageData, dataUrl)
        setFirstImageData(null)
      }
    } catch {
      showToast(t('loadFailed'), 'error')
      setFirstImageData(null)
    }
  }

  const handleCameraClick = () => {
    cameraInputRef.current?.click()
  }

  const handleGalleryClick = () => {
    setAlbumPopupOpen(true)
  }

  const handleOneImageMode = () => {
    setAlbumPopupOpen(false)
    setTimeout(() => {
      galleryInputRef.current?.click()
    }, 50)
  }

  const handleTwoImageMode = () => {
    setAlbumPopupOpen(false)
    setTimeout(() => {
      firstImageInputRef.current?.click()
    }, 50)
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
      <input
        ref={firstImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleFirstImageChange}
        className="hidden"
        disabled={!cvLoaded}
      />
      <input
        ref={secondImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleSecondImageChange}
        className="hidden"
        disabled={!cvLoaded}
      />

      {/* Outer placemat panel */}
      <div
        className="flex w-full flex-col items-center gap-5 rounded-2xl px-5 py-4"
        style={{
          background: 'linear-gradient(160deg, #FFFDF4 0%, #FFF8E7 50%, #FDF3D8 100%)',
          border: '2px solid var(--border)',
          boxShadow:
            '0 1px 0 rgba(255,255,255,0.9) inset, 0 -1px 0 rgba(180,130,60,0.2) inset, 0 4px 16px rgba(60,36,21,0.1), 0 1px 3px rgba(60,36,21,0.07)',
        }}
      >
        <div className="menu-stripe-olive mb-3 self-stretch" />

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
                aria-hidden="true"
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

        <div className="menu-stripe-olive mt-3 self-stretch" />
      </div>

      {/* Album mode popup */}
      {albumPopupOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(60,36,21,0.4)' }}
          onClick={() => setAlbumPopupOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="mx-4 w-full max-w-xs overflow-hidden rounded-2xl"
            style={{
              background: 'var(--parchment)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 32px rgba(60,36,21,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-4 py-3 text-center"
              style={{ borderBottom: '1px solid var(--border-light)' }}
            >
              <span className="text-sm font-bold" style={{ color: 'var(--espresso)' }}>
                {t('albumModeTitle')}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-4">
              <button onClick={handleOneImageMode} className="btn-action w-full py-3 text-sm">
                {t('albumModeOne')}
              </button>
              <button onClick={handleTwoImageMode} className="btn-ghost w-full py-3 text-sm">
                {t('albumModeTwo')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
        aria-hidden="true"
      >
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    </div>
  )
}
