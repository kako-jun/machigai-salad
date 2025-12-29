'use client'

import { useState } from 'react'
import type { Point } from '@/types'
import { useOpenCV } from '@/hooks'
import ImageUpload from './ImageUpload'
import ImageComparison from './ImageComparison'
import PaperCornersAdjustment from './PaperCornersAdjustment'

export default function ImageProcessor() {
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [leftImage, setLeftImage] = useState<string | null>(null)
  const [rightImage, setRightImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [detectedCorners, setDetectedCorners] = useState<Point[] | null>(null)
  const [showCornersAdjustment, setShowCornersAdjustment] = useState(false)

  const { cvLoaded, detectCorners, processImage } = useOpenCV()

  const handleImageUpload = async (imageDataUrl: string) => {
    setOriginalImage(imageDataUrl)
    setIsProcessing(true)

    try {
      const corners = await detectCorners(imageDataUrl)

      if (corners) {
        console.log('Paper detected, showing adjustment UI')
        setDetectedCorners(corners)
        setShowCornersAdjustment(true)
      } else {
        console.log('Paper not detected, processing without corners')
        await processAndSetImages(imageDataUrl, null)
      }
    } catch (error) {
      console.error('Error processing image:', error)
      alert('😅 うまくいかなかったみたい。もう一度写真をとってみてね！')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCornersApply = async (adjustedCorners: Point[]) => {
    setIsProcessing(true)
    setShowCornersAdjustment(false)

    try {
      await processAndSetImages(originalImage!, adjustedCorners)
    } catch (error) {
      console.error('Error processing image with corners:', error)
      alert('😅 うまくいかなかったみたい。もう一度やってみてね！')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCornersCancel = async () => {
    setIsProcessing(true)
    setShowCornersAdjustment(false)

    try {
      await processAndSetImages(originalImage!, null)
    } catch (error) {
      console.error('Error processing image:', error)
      alert('😅 うまくいかなかったみたい。もう一度やってみてね！')
    } finally {
      setIsProcessing(false)
    }
  }

  const processAndSetImages = async (imageDataUrl: string, corners: Point[] | null) => {
    const { leftImage, rightImage } = await processImage(imageDataUrl, corners)
    setLeftImage(leftImage)
    setRightImage(rightImage)
  }

  const handleReset = () => {
    setOriginalImage(null)
    setLeftImage(null)
    setRightImage(null)
    setDetectedCorners(null)
    setShowCornersAdjustment(false)
  }

  return (
    <div className="space-y-6">
      {!originalImage ? (
        <ImageUpload onImageUpload={handleImageUpload} cvLoaded={cvLoaded} />
      ) : (
        <>
          {showCornersAdjustment && detectedCorners ? (
            <PaperCornersAdjustment
              imageDataUrl={originalImage}
              initialCorners={detectedCorners}
              onApply={handleCornersApply}
              onCancel={handleCornersCancel}
            />
          ) : isProcessing ? (
            <LoadingIndicator />
          ) : leftImage && rightImage ? (
            <>
              <ImageComparison leftImage={leftImage} rightImage={rightImage} />
              <ResetButton onClick={handleReset} />
            </>
          ) : null}
        </>
      )}
    </div>
  )
}

function LoadingIndicator() {
  return (
    <div className="rounded-lg bg-gradient-to-br from-orange-50 to-yellow-50 p-8 text-center shadow-lg">
      <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-orange-500"></div>
      <p className="text-lg font-semibold text-orange-600">🔍 絵をチェック中...</p>
      <p className="mt-2 text-sm text-gray-600">ちょっと待ってね！</p>
    </div>
  )
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="text-center">
      <button
        onClick={onClick}
        className="rounded-lg bg-orange-500 px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-orange-600 hover:shadow-lg active:scale-95"
      >
        🔄 別の絵で遊ぶ
      </button>
    </div>
  )
}
