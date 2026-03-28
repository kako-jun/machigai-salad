'use client'

import { useState, useRef } from 'react'
import type { Point } from '@/types'
import { useOpenCV } from '@/hooks'
import { useI18n } from '@/lib/i18n'
import { showToast } from './Toast'
import { addSave, loadAllSaves } from '@/lib/storage'
import type { SaveEntry } from '@/lib/storage'
import ImageUpload, { SaveIcon } from './ImageUpload'
import ImageComparison from './ImageComparison'
import PaperCornersAdjustment from './PaperCornersAdjustment'
import SavesPopup from './SavesPopup'

type Phase = 'upload' | 'detecting' | 'adjust' | 'processing' | 'result'

const PHASE_STEP: Record<Phase, number> = {
  upload: 1,
  detecting: 1,
  adjust: 2,
  processing: 2,
  result: 3,
}

export default function ImageProcessor() {
  const { t } = useI18n()
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [leftImage, setLeftImage] = useState<string | null>(null)
  const [rightImage, setRightImage] = useState<string | null>(null)
  const [suggestedCorners, setSuggestedCorners] = useState<Point[] | null>(null)
  const [phase, setPhase] = useState<Phase>('upload')
  const [popupOpen, setPopupOpen] = useState(false)
  const [saveCount, setSaveCount] = useState(() => {
    if (typeof window === 'undefined') return 0
    try {
      return loadAllSaves().length
    } catch {
      return 0
    }
  })

  const lastCornersRef = useRef<Point[] | null>(null)
  const currentOffsetRef = useRef({ x: 0, y: 0 })
  const restoredOffsetRef = useRef<{ x: number; y: number } | null>(null)
  const currentWarpRef = useRef<
    | [
        { x: number; y: number },
        { x: number; y: number },
        { x: number; y: number },
        { x: number; y: number },
      ]
    | undefined
  >(undefined)
  const restoredWarpRef = useRef<
    | [
        { x: number; y: number },
        { x: number; y: number },
        { x: number; y: number },
        { x: number; y: number },
      ]
    | undefined
  >(undefined)

  const { cvLoaded, loadState, loadError, retryLoad, suggestCorners, processImage } = useOpenCV()

  const handleImageUpload = async (imageDataUrl: string) => {
    setPhase('detecting')

    let size: { width: number; height: number }
    try {
      size = await getImageSize(imageDataUrl)
    } catch {
      showToast(t('loadFailed'), 'error')
      setPhase('upload')
      return
    }

    if (size.width < 100 || size.height < 100) {
      showToast(t('imageTooSmall'), 'error')
      setPhase('upload')
      return
    }

    // Resize large images to save memory and speed up processing
    let resizedUrl = imageDataUrl
    try {
      resizedUrl = await resizeImage(imageDataUrl, size.width, size.height)
      if (resizedUrl !== imageDataUrl) {
        const newSize = await getImageSize(resizedUrl)
        size = newSize
      }
    } catch {
      // Fall through with original image
    }

    setOriginalImage(resizedUrl)
    setImageSize(size)

    try {
      const suggestion = await suggestCorners(resizedUrl)
      setSuggestedCorners(suggestion)
    } catch {
      setSuggestedCorners(null)
    }

    setPhase('adjust')
  }

  const handleCornersApply = async (adjustedCorners: Point[]) => {
    lastCornersRef.current = adjustedCorners
    setPhase('processing')

    try {
      const { leftImage, rightImage } = await processImage(originalImage!, adjustedCorners)
      setLeftImage(leftImage)
      setRightImage(rightImage)
      setPhase('result')
    } catch (error) {
      console.error('Error processing image with corners:', error)
      showToast(t('processError'), 'error')
      setPhase('adjust')
    }
  }

  const handleBackToAdjust = () => {
    setLeftImage(null)
    setRightImage(null)
    currentOffsetRef.current = { x: 0, y: 0 }
    restoredOffsetRef.current = null
    currentWarpRef.current = undefined
    restoredWarpRef.current = undefined
    setSuggestedCorners(lastCornersRef.current)
    setPhase('adjust')
  }

  const handleReset = () => {
    setOriginalImage(null)
    setImageSize(null)
    setLeftImage(null)
    setRightImage(null)
    setSuggestedCorners(null)
    lastCornersRef.current = null
    currentOffsetRef.current = { x: 0, y: 0 }
    restoredOffsetRef.current = null
    currentWarpRef.current = undefined
    restoredWarpRef.current = undefined
    setPhase('upload')
  }

  const [sharing, setSharing] = useState(false)

  const handleShareResult = async () => {
    if (!leftImage || !rightImage || sharing) return
    setSharing(true)

    try {
      const blob = await generateToggleApng(leftImage, rightImage, 1000)
      const file = new File([blob], 'machigai-salad.png', { type: 'image/png' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t('shareResultTitle'),
          text: t('shareResultText'),
        })
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'machigai-salad.png'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e: unknown) {
      // Ignore user cancellation, notify on actual errors
      if (e instanceof Error && e.name !== 'AbortError') {
        showToast(t('shareFailed'), 'error')
      }
    } finally {
      setSharing(false)
    }
  }

  const handleSave = () => {
    if (!originalImage || !imageSize || !lastCornersRef.current) return
    const result = addSave({
      originalImage,
      corners: lastCornersRef.current,
      offset: currentOffsetRef.current,
      imageSize,
      warpCorners: currentWarpRef.current,
    })
    if (result) {
      setSaveCount((c) => c + 1)
      showToast(t('saved'), 'info')
    } else {
      showToast(t('saveFailed'), 'error')
    }
  }

  const handleLoad = async (entry: SaveEntry) => {
    setPopupOpen(false)

    setOriginalImage(entry.originalImage)
    setImageSize(entry.imageSize)
    setSuggestedCorners(entry.corners)
    lastCornersRef.current = entry.corners
    restoredOffsetRef.current = entry.offset
    currentOffsetRef.current = entry.offset
    restoredWarpRef.current = entry.warpCorners
    currentWarpRef.current = entry.warpCorners
    setPhase('processing')

    try {
      const { leftImage, rightImage } = await processImage(entry.originalImage, entry.corners)
      setLeftImage(leftImage)
      setRightImage(rightImage)
      setPhase('result')
    } catch (error) {
      console.error('Error restoring save:', error)
      showToast(t('restoreFailed'), 'error')
      setPhase('adjust')
    }
  }

  const currentStep = PHASE_STEP[phase]

  return (
    <div className="space-y-4">
      {phase !== 'upload' && (
        <StepIndicator current={currentStep} labels={[t('step1'), t('step2'), t('step3')]} />
      )}

      {phase === 'upload' && (
        <ImageUpload
          onImageUpload={handleImageUpload}
          cvLoaded={cvLoaded}
          loadState={loadState}
          loadError={loadError}
          onRetry={retryLoad}
          saveCount={saveCount}
          onOpenSaves={() => setPopupOpen(true)}
        />
      )}

      {phase === 'detecting' && <LoadingIndicator message={t('loading')} />}

      {phase === 'adjust' && originalImage && imageSize && (
        <PaperCornersAdjustment
          imageDataUrl={originalImage}
          initialCorners={suggestedCorners}
          imageSize={imageSize}
          onApply={handleCornersApply}
          onCancel={handleReset}
          onRedetect={async (sensitivity) => {
            return await suggestCorners(originalImage!, sensitivity)
          }}
        />
      )}

      {phase === 'processing' && <LoadingIndicator message={t('processing')} />}

      {phase === 'result' && leftImage && rightImage && (
        <>
          <ImageComparison
            leftImage={leftImage}
            rightImage={rightImage}
            initialOffset={restoredOffsetRef.current ?? undefined}
            onOffsetChange={(o) => {
              currentOffsetRef.current = o
            }}
            initialWarpCorners={restoredWarpRef.current}
            onWarpChange={(w) => {
              currentWarpRef.current = w
            }}
            onBackToAdjust={handleBackToAdjust}
          />
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleSave}
                className="btn-ghost flex items-center gap-1.5 px-5 py-3 text-sm"
              >
                <SaveIcon size={16} />
                {t('saveBtn')}
              </button>
              <button
                onClick={() => handleShareResult()}
                disabled={sharing}
                className="btn-action flex items-center gap-1.5 px-5 py-3 text-sm"
              >
                <ShareResultIcon size={16} />
                {t('shareResult')}
              </button>
            </div>
            <div className="flex justify-center">
              <button onClick={handleReset} className="btn-ghost px-5 py-2.5 text-xs">
                {t('retryBtn')}
              </button>
            </div>
          </div>
        </>
      )}

      <SavesPopup
        open={popupOpen}
        onClose={() => {
          setPopupOpen(false)
          setSaveCount(loadAllSaves().length)
        }}
        onLoad={handleLoad}
      />
    </div>
  )
}

function getImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = reject
    img.src = dataUrl
  })
}

/** Maximum image dimension (longest side) in physical pixels */
const MAX_IMAGE_DIM = 2400

/**
 * Resize an image data URL so its longest side does not exceed maxDim physical pixels.
 * Uses the display's devicePixelRatio to determine the practical upper bound,
 * capped at MAX_IMAGE_DIM. Returns the original if already small enough.
 */
function resizeImage(dataUrl: string, width: number, height: number): Promise<string> {
  const screenLong = Math.max(screen.width, screen.height) * (window.devicePixelRatio || 1)
  const maxDim = Math.min(Math.max(screenLong, 1200), MAX_IMAGE_DIM)
  const longest = Math.max(width, height)

  if (longest <= maxDim) return Promise.resolve(dataUrl)

  const scale = maxDim / longest
  const newW = Math.round(width * scale)
  const newH = Math.round(height * scale)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = newW
      canvas.height = newH
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      ctx.drawImage(img, 0, 0, newW, newH)
      resolve(canvas.toDataURL('image/webp', 0.92))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

/** APNG share image max dimension */
const APNG_MAX_DIM = 480

/**
 * Generate an animated PNG (APNG) that toggles between left and right images.
 * Infinite loop, 1-second interval per frame. Full color (lossless).
 */
async function generateToggleApng(
  leftDataUrl: string,
  rightDataUrl: string,
  delay: number
): Promise<Blob> {
  const loadImg = (src: string) =>
    new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image()
      img.onload = () => res(img)
      img.onerror = rej
      img.src = src
    })

  const [leftImg, rightImg] = await Promise.all([loadImg(leftDataUrl), loadImg(rightDataUrl)])

  const w = leftImg.width
  const h = leftImg.height
  const scale = Math.min(1, APNG_MAX_DIM / Math.max(w, h))
  const gw = Math.round(w * scale)
  const gh = Math.round(h * scale)

  const canvas = document.createElement('canvas')
  canvas.width = gw
  canvas.height = gh
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable')

  // Extract RGBA data for each frame
  ctx.drawImage(leftImg, 0, 0, gw, gh)
  const leftData = ctx.getImageData(0, 0, gw, gh).data.buffer.slice(0)

  ctx.drawImage(rightImg, 0, 0, gw, gh)
  const rightData = ctx.getImageData(0, 0, gw, gh).data.buffer.slice(0)

  const UPNG = await import('upng-js')
  const apngBuffer = UPNG.encode(
    [leftData, rightData],
    gw,
    gh,
    0, // 0 = lossless full color
    [delay, delay]
  )

  return new Blob([apngBuffer], { type: 'image/png' })
}

function ShareResultIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

function StepIndicator({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div
      className="flex items-center justify-center gap-1 rounded-2xl px-4 py-3"
      style={{
        background: 'linear-gradient(145deg, #FFF8E7, #FDF3D8)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset, 0 2px 6px rgba(60,36,21,0.06)',
      }}
    >
      {labels.map((label, i) => {
        const step = i + 1
        const isActive = step === current
        const isDone = step < current
        return (
          <div key={step} className="flex items-center gap-1">
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isDone
                    ? 'step-badge-done text-white'
                    : isActive
                      ? 'step-badge-active text-white'
                      : 'step-badge-idle'
                }`}
              >
                {isDone ? (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span
                className={`text-xs font-medium ${isActive ? 'font-bold' : ''}`}
                style={{ color: isActive ? 'var(--espresso)' : 'var(--muted)' }}
              >
                {label}
              </span>
            </div>
            {step < labels.length && (
              <div
                className="mx-1 h-px w-5"
                style={{
                  background:
                    step < current
                      ? 'linear-gradient(90deg, var(--olive), var(--golden-dark))'
                      : 'var(--border-light)',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function LoadingIndicator({ message }: { message: string }) {
  return (
    <div className="animate-fade-in flex flex-col items-center py-16">
      {/* Spinning plate loader */}
      <div
        className="animate-spin-smooth mb-4 h-10 w-10 rounded-full"
        style={{
          border: '3px solid var(--parchment)',
          borderTopColor: 'var(--accent)',
          borderRightColor: 'var(--golden)',
          boxShadow: '0 2px 8px rgba(60,36,21,0.15)',
        }}
      />
      <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
        {message}
      </p>
    </div>
  )
}
