'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Point, CornerOffsets } from '@/types'
import { useOpenCV } from '@/hooks'
import { useI18n } from '@/lib/i18n'
import { getImageSize, resizeImage, generateToggleGif, generateToggleApng } from '@/lib/image-utils'
import { showToast } from './Toast'
import { addSave, updateSave, loadAllSaves } from '@/lib/storage'
import type { SaveEntry } from '@/lib/storage'
import { SaveIcon, ShareResultIcon, DownloadIcon } from './icons'
import ImageUpload from './ImageUpload'
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
  const ZERO_CORNERS: CornerOffsets = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]
  const currentWarpRef = useRef<CornerOffsets>(ZERO_CORNERS)
  const restoredWarpRef = useRef<CornerOffsets | null>(null)
  const currentCenterRef = useRef<Point>({ x: 0, y: 0 })
  const restoredCenterRef = useRef<Point | null>(null)
  /** Displayed image rect in CSS pixels (for scaling warp params to GIF space) */
  const displayRectRef = useRef<{ w: number; h: number; left: number; top: number }>({
    w: 1,
    h: 1,
    left: 0,
    top: 0,
  })
  /** Current save entry ID — overwrite this entry on subsequent saves until new image */
  const currentSaveIdRef = useRef<string | null>(null)

  const { cvLoaded, loadState, loadError, retryLoad, suggestCorners, processImage } = useOpenCV()

  const handleImageUpload = async (imageDataUrl: string) => {
    currentSaveIdRef.current = null
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
    currentWarpRef.current = ZERO_CORNERS
    restoredWarpRef.current = null
    currentCenterRef.current = { x: 0, y: 0 }
    restoredCenterRef.current = null
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
    currentWarpRef.current = ZERO_CORNERS
    restoredWarpRef.current = null
    currentCenterRef.current = { x: 0, y: 0 }
    restoredCenterRef.current = null
    currentSaveIdRef.current = null
    displayRectRef.current = { w: 1, h: 1, left: 0, top: 0 }
    if (gifPreview) {
      URL.revokeObjectURL(gifPreview.url)
      setGifPreview(null)
    }
    setPhase('upload')
  }

  const [sharing, setSharing] = useState(false)
  const [gifPreview, setGifPreview] = useState<{ url: string; blob: Blob } | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [apngGenerating, setApngGenerating] = useState(false)

  const handleCreateGif = async () => {
    if (!leftImage || !rightImage || sharing) return
    setSharing(true)

    try {
      const blob = await generateToggleGif(
        {
          leftDataUrl: leftImage,
          rightDataUrl: rightImage,
          displaySize: { w: displayRectRef.current.w, h: displayRectRef.current.h },
          offset: currentOffsetRef.current,
          cornerOffsets: currentWarpRef.current,
          centerOffset: currentCenterRef.current,
        },
        1000
      )
      const url = URL.createObjectURL(blob)
      setGifPreview({ url, blob })
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        showToast(t('shareFailed'), 'error')
      }
    } finally {
      setSharing(false)
    }
  }

  const handleGifShare = async () => {
    if (!gifPreview) return
    try {
      const file = new File([gifPreview.blob], 'machigai-salad.gif', { type: 'image/gif' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t('shareResultTitle'),
          text: t('shareResultText'),
        })
      } else {
        // Web Share 非対応: GIF をダウンロード
        const a = document.createElement('a')
        a.href = gifPreview.url
        a.download = 'machigai-salad.gif'
        a.click()
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        showToast(t('shareFailed'), 'error')
      }
    }
  }

  const handleApngDownload = async () => {
    if (!leftImage || !rightImage || apngGenerating) return
    setApngGenerating(true)
    try {
      const blob = await generateToggleApng(
        {
          leftDataUrl: leftImage,
          rightDataUrl: rightImage,
          displaySize: { w: displayRectRef.current.w, h: displayRectRef.current.h },
          offset: currentOffsetRef.current,
          cornerOffsets: currentWarpRef.current,
          centerOffset: currentCenterRef.current,
        },
        1000
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'machigai-salad.png'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showToast(t('shareFailed'), 'error')
    } finally {
      setApngGenerating(false)
    }
  }

  const handleGifClose = useCallback(() => {
    if (gifPreview) {
      URL.revokeObjectURL(gifPreview.url)
      setGifPreview(null)
    }
  }, [gifPreview])

  // Escape key to close GIF preview
  useEffect(() => {
    if (!gifPreview) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleGifClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [gifPreview, handleGifClose])

  const handleSave = () => {
    if (!originalImage || !imageSize || !lastCornersRef.current) return
    const data = {
      originalImage,
      corners: lastCornersRef.current,
      offset: currentOffsetRef.current,
      imageSize,
      warpCorners: currentWarpRef.current,
      centerOffset: currentCenterRef.current,
    }
    // Overwrite existing entry for the same image, or create new
    const existing = currentSaveIdRef.current
    const updated = existing ? updateSave(existing, data) : null
    const result = updated ?? addSave(data)
    if (result) {
      currentSaveIdRef.current = result.id
      if (!updated) setSaveCount((c) => c + 1)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 1500)
    } else {
      showToast(t('saveFailed'), 'error')
    }
  }

  const handleLoad = async (entry: SaveEntry) => {
    setPopupOpen(false)
    if (gifPreview) {
      URL.revokeObjectURL(gifPreview.url)
      setGifPreview(null)
    }
    currentSaveIdRef.current = entry.id

    setOriginalImage(entry.originalImage)
    setImageSize(entry.imageSize)
    setSuggestedCorners(entry.corners)
    lastCornersRef.current = entry.corners
    restoredOffsetRef.current = entry.offset
    currentOffsetRef.current = entry.offset
    restoredWarpRef.current = entry.warpCorners
    currentWarpRef.current = entry.warpCorners
    restoredCenterRef.current = entry.centerOffset
    currentCenterRef.current = entry.centerOffset
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
            initialWarpCorners={restoredWarpRef.current ?? undefined}
            onWarpChange={(w) => {
              currentWarpRef.current = w
            }}
            initialCenterOffset={restoredCenterRef.current ?? undefined}
            onCenterChange={(c) => {
              currentCenterRef.current = c
            }}
            onDisplaySize={(rect) => {
              displayRectRef.current = rect
            }}
            onBackToAdjust={handleBackToAdjust}
          />
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              onClick={handleSave}
              className="btn-ghost flex items-center gap-1.5 px-5 py-3 text-sm"
              style={saveSuccess ? { color: '#2d8a4e', borderColor: '#2d8a4e' } : undefined}
            >
              {saveSuccess ? (
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2d8a4e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <SaveIcon size={16} />
              )}
              {t('saveBtn')}
            </button>
            <button
              onClick={handleCreateGif}
              disabled={sharing}
              className="btn-action flex items-center gap-1.5 px-5 py-3 text-sm"
            >
              <ShareResultIcon size={16} />
              {t('shareResult')}
            </button>
            <button onClick={handleReset} className="btn-ghost px-5 py-3 text-sm">
              {t('retryBtn')}
            </button>
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

      {/* GIF Preview Modal */}
      {gifPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(60,36,21,0.4)' }}
          onClick={handleGifClose}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="mx-4 w-full max-w-sm overflow-hidden rounded-2xl"
            style={{
              background: 'var(--parchment)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 32px rgba(60,36,21,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--border-light)' }}
            >
              <span className="text-sm font-bold" style={{ color: 'var(--espresso)' }}>
                {t('shareResultTitle')}
              </span>
              <button
                onClick={handleGifClose}
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm"
                style={{ color: 'var(--muted)', background: 'var(--border-light)' }}
              >
                ✕
              </button>
            </div>
            <div className="flex justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gifPreview.url}
                alt="GIF preview"
                className="max-h-[50vh] rounded-lg object-contain"
                style={{ border: '1px solid var(--border-light)' }}
              />
            </div>
            <div
              className="flex gap-2 px-4 py-3"
              style={{ borderTop: '1px solid var(--border-light)' }}
            >
              <button
                onClick={handleApngDownload}
                disabled={apngGenerating}
                className="btn-ghost flex flex-1 items-center justify-center gap-1.5 py-3 text-sm"
              >
                <DownloadIcon size={16} />
                <span className="flex flex-col items-center">
                  <span>{apngGenerating ? '...' : t('gifPreviewDownload')}</span>
                  <span className="text-[10px] opacity-60">{t('pngFormatHint')}</span>
                </span>
              </button>
              <button
                onClick={handleGifShare}
                className="btn-action flex flex-1 items-center justify-center gap-1.5 py-3 text-sm"
              >
                <ShareResultIcon size={16} />
                <span className="flex flex-col items-center">
                  <span>{t('gifPreviewShare')}</span>
                  <span className="text-[10px] opacity-60">{t('gifFormatHint')}</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
