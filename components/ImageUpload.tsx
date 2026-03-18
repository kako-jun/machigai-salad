'use client'

import { useRef } from 'react'

type LoadState = 'loading' | 'ready' | 'error'

interface ImageUploadProps {
  onImageUpload: (imageDataUrl: string) => void
  cvLoaded: boolean
  loadState: LoadState
  loadError: string | null
  onRetry: () => void
}

/**
 * モバイルデバイスかどうかを判定する
 * capture 属性はモバイルのみ有効にする（デスクトップでは選択肢がカメラのみに制限されるため）
 */
function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

export default function ImageUpload({
  onImageUpload,
  cvLoaded,
  loadState,
  loadError,
  onRetry,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const useCaptureAttr = isMobileDevice()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageDataUrl = event.target?.result as string
      onImageUpload(imageDataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="animate-fade-in flex flex-col items-center py-10">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        {...(useCaptureAttr ? { capture: 'environment' } : {})}
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
        {loadState === 'error' ? (
          /* Error state with retry */
          <div className="flex flex-col items-center gap-4 px-4 py-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                background: 'linear-gradient(145deg, #FFF0EC, #FFE4DC)',
                border: '2px solid #D4885A',
                boxShadow: '0 2px 8px rgba(60,36,21,0.12)',
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8B3E1A"
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
              <p className="text-sm font-bold" style={{ color: '#8B3E1A' }}>
                よみこめなかったよ
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                {loadError || 'ネットワーク接続を確認してね'}
              </p>
            </div>

            <button onClick={onRetry} className="btn-action px-8 py-3 text-sm">
              もう一回ためす
            </button>
          </div>
        ) : (
          /* Normal state: loading or ready */
          <>
            {/* Camera shutter button */}
            <button
              onClick={handleButtonClick}
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
                {cvLoaded ? 'しゃしんを とる' : 'じゅんびちゅう...'}
              </span>
            </button>

            {/* Instruction text styled like menu footnote */}
            <div
              className="rounded-xl px-4 py-2.5 text-center"
              style={{
                background: 'rgba(245,197,24,0.12)',
                border: '1px solid rgba(212,160,16,0.3)',
              }}
            >
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                間違いさがしの紙を
                <br />
                まっすぐ撮ってね
              </p>
            </div>
          </>
        )}
      </div>
    </div>
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
