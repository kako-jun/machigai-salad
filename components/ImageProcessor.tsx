'use client'

import { useState, useRef, useEffect } from 'react'
import ImageUpload from './ImageUpload'
import ImageComparison from './ImageComparison'

export default function ImageProcessor() {
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [leftImage, setLeftImage] = useState<string | null>(null)
  const [rightImage, setRightImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cvLoaded, setCvLoaded] = useState(false)

  useEffect(() => {
    // Load OpenCV.js
    const script = document.createElement('script')
    script.src = 'https://docs.opencv.org/4.9.0/opencv.js'
    script.async = true
    script.onload = () => {
      // @ts-ignore
      if (window.cv) {
        // @ts-ignore
        window.cv.onRuntimeInitialized = () => {
          console.log('OpenCV.js loaded successfully')
          setCvLoaded(true)
        }
      }
    }
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handleImageUpload = async (imageDataUrl: string) => {
    setOriginalImage(imageDataUrl)
    setIsProcessing(true)

    try {
      // Wait for OpenCV to be loaded
      if (!cvLoaded) {
        console.log('Waiting for OpenCV to load...')
        await new Promise((resolve) => {
          const interval = setInterval(() => {
            if (cvLoaded) {
              clearInterval(interval)
              resolve(true)
            }
          }, 100)
        })
      }

      // Process image with OpenCV
      await processImage(imageDataUrl)
    } catch (error) {
      console.error('Error processing image:', error)
      alert('画像の処理中にエラーが発生しました。')
    } finally {
      setIsProcessing(false)
    }
  }

  const processImage = async (imageDataUrl: string) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          // @ts-ignore
          const cv = window.cv

          // Create canvas and mat
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0)

          let src = cv.imread(canvas)

          // Color correction (histogram equalization)
          let corrected = new cv.Mat()
          if (src.channels() === 1) {
            cv.equalizeHist(src, corrected)
          } else {
            cv.cvtColor(src, corrected, cv.COLOR_RGBA2RGB)
            let channels = new cv.MatVector()
            cv.split(corrected, channels)
            for (let i = 0; i < 3; i++) {
              cv.equalizeHist(channels.get(i), channels.get(i))
            }
            cv.merge(channels, corrected)
            channels.delete()
          }

          // Split left and right
          const midX = Math.floor(corrected.cols / 2)
          const leftRect = new cv.Rect(0, 0, midX, corrected.rows)
          const rightRect = new cv.Rect(midX, 0, corrected.cols - midX, corrected.rows)

          const leftMat = corrected.roi(leftRect)
          const rightMat = corrected.roi(rightRect)

          // Convert to canvas
          const leftCanvas = document.createElement('canvas')
          cv.imshow(leftCanvas, leftMat)
          setLeftImage(leftCanvas.toDataURL())

          const rightCanvas = document.createElement('canvas')
          cv.imshow(rightCanvas, rightMat)
          setRightImage(rightCanvas.toDataURL())

          // Cleanup
          src.delete()
          corrected.delete()
          leftMat.delete()
          rightMat.delete()

          resolve()
        } catch (error) {
          reject(error)
        }
      }
      img.onerror = reject
      img.src = imageDataUrl
    })
  }

  const handleReset = () => {
    setOriginalImage(null)
    setLeftImage(null)
    setRightImage(null)
  }

  return (
    <div className="space-y-6">
      {!originalImage ? (
        <ImageUpload onImageUpload={handleImageUpload} cvLoaded={cvLoaded} />
      ) : (
        <>
          {isProcessing ? (
            <div className="rounded-lg bg-white p-8 text-center shadow-lg">
              <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-orange-500"></div>
              <p className="text-gray-600">画像を処理中...</p>
            </div>
          ) : leftImage && rightImage ? (
            <>
              <ImageComparison leftImage={leftImage} rightImage={rightImage} />
              <div className="text-center">
                <button
                  onClick={handleReset}
                  className="rounded-lg bg-orange-500 px-6 py-3 text-white transition-colors hover:bg-orange-600"
                >
                  別の画像を読み込む
                </button>
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  )
}
