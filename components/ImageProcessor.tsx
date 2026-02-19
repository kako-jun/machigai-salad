'use client'

import { useState } from 'react'
import type { Point } from '@/types'
import { useOpenCV } from '@/hooks'
import ImageUpload from './ImageUpload'
import ImageComparison from './ImageComparison'
import PaperCornersAdjustment from './PaperCornersAdjustment'

type Phase = 'upload' | 'detecting' | 'adjust' | 'processing' | 'result'

const PHASE_LABELS = ['さつえい', 'かどあわせ', 'くらべる'] as const

const PHASE_STEP: Record<Phase, number> = {
  upload: 1,
  detecting: 1,
  adjust: 2,
  processing: 2,
  result: 3,
}

export default function ImageProcessor() {
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [leftImage, setLeftImage] = useState<string | null>(null)
  const [rightImage, setRightImage] = useState<string | null>(null)
  const [suggestedCorners, setSuggestedCorners] = useState<Point[] | null>(null)
  const [phase, setPhase] = useState<Phase>('upload')

  const { cvLoaded, suggestCorners, processImage } = useOpenCV()

  const handleImageUpload = async (imageDataUrl: string) => {
    setOriginalImage(imageDataUrl)
    setPhase('detecting')

    const size = await getImageSize(imageDataUrl)
    setImageSize(size)

    try {
      const suggestion = await suggestCorners(imageDataUrl)
      setSuggestedCorners(suggestion)
    } catch {
      setSuggestedCorners(null)
    }

    setPhase('adjust')
  }

  const handleCornersApply = async (adjustedCorners: Point[]) => {
    setPhase('processing')

    try {
      const { leftImage, rightImage } = await processImage(originalImage!, adjustedCorners)
      setLeftImage(leftImage)
      setRightImage(rightImage)
      setPhase('result')
    } catch (error) {
      console.error('Error processing image with corners:', error)
      alert('うまくいかなかったみたい。かどの位置をなおして もう一回ためしてね。')
      setPhase('adjust')
    }
  }

  const handleReset = () => {
    setOriginalImage(null)
    setImageSize(null)
    setLeftImage(null)
    setRightImage(null)
    setSuggestedCorners(null)
    setPhase('upload')
  }

  const currentStep = PHASE_STEP[phase]

  return (
    <div className="space-y-4">
      {phase !== 'upload' && <StepIndicator current={currentStep} labels={[...PHASE_LABELS]} />}

      {phase === 'upload' && <ImageUpload onImageUpload={handleImageUpload} cvLoaded={cvLoaded} />}

      {phase === 'detecting' && <LoadingIndicator message="よみこみちゅう..." />}

      {phase === 'adjust' && originalImage && imageSize && (
        <PaperCornersAdjustment
          imageDataUrl={originalImage}
          initialCorners={suggestedCorners}
          imageSize={imageSize}
          onApply={handleCornersApply}
          onCancel={handleReset}
        />
      )}

      {phase === 'processing' && <LoadingIndicator message="しょりちゅう..." />}

      {phase === 'result' && leftImage && rightImage && (
        <>
          <ImageComparison leftImage={leftImage} rightImage={rightImage} />
          <ResetButton onClick={handleReset} />
        </>
      )}
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

function StepIndicator({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div className="flex items-center justify-center gap-1">
      {labels.map((label, i) => {
        const step = i + 1
        const isActive = step === current
        const isDone = step < current
        return (
          <div key={step} className="flex items-center gap-1">
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isDone
                    ? 'bg-success text-white'
                    : isActive
                      ? 'bg-accent text-white'
                      : 'bg-border text-muted'
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
              <span className={`text-xs ${isActive ? 'font-bold text-foreground' : 'text-muted'}`}>
                {label}
              </span>
            </div>
            {step < labels.length && (
              <div className={`mx-1 h-px w-4 ${step < current ? 'bg-success' : 'bg-border'}`} />
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
      <div className="animate-spin-smooth mb-4 h-8 w-8 rounded-full border-[2.5px] border-accent border-t-transparent" />
      <p className="text-sm text-muted">{message}</p>
    </div>
  )
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="pt-2 text-center">
      <button
        onClick={onClick}
        className="rounded-xl border border-border bg-surface px-6 py-3 text-sm font-medium text-muted shadow-sm transition-all hover:bg-surface-hover active:scale-[0.97]"
      >
        もう一回やる
      </button>
    </div>
  )
}
