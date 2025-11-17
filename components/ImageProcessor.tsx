'use client'

import { useState, useRef, useEffect } from 'react'
import ImageUpload from './ImageUpload'
import ImageComparison from './ImageComparison'
import PaperCornersAdjustment from './PaperCornersAdjustment'

interface Point {
  x: number
  y: number
}

export default function ImageProcessor() {
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [leftImage, setLeftImage] = useState<string | null>(null)
  const [rightImage, setRightImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cvLoaded, setCvLoaded] = useState(false)
  const [detectedCorners, setDetectedCorners] = useState<Point[] | null>(null)
  const [showCornersAdjustment, setShowCornersAdjustment] = useState(false)

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

      // Detect paper corners
      const corners = await detectPaperCorners(imageDataUrl)

      if (corners) {
        // Show corners adjustment UI
        console.log('Paper detected, showing adjustment UI')
        setDetectedCorners(corners)
        setShowCornersAdjustment(true)
      } else {
        // If no paper detected, process without corners
        console.log('Paper not detected, processing without corners')
        await processImageWithCorners(imageDataUrl, null)
      }
    } catch (error) {
      console.error('Error processing image:', error)
      alert('画像の処理中にエラーが発生しました。')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCornersApply = async (adjustedCorners: Point[]) => {
    setIsProcessing(true)
    setShowCornersAdjustment(false)

    try {
      await processImageWithCorners(originalImage!, adjustedCorners)
    } catch (error) {
      console.error('Error processing image with corners:', error)
      alert('画像の処理中にエラーが発生しました。')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCornersCancel = async () => {
    setIsProcessing(true)
    setShowCornersAdjustment(false)

    try {
      // Process without corners
      await processImageWithCorners(originalImage!, null)
    } catch (error) {
      console.error('Error processing image:', error)
      alert('画像の処理中にエラーが発生しました。')
    } finally {
      setIsProcessing(false)
    }
  }

  const detectPaperContour = (src: any, cv: any) => {
    // Convert to grayscale
    const gray = new cv.Mat()
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

    // Apply Gaussian blur to reduce noise
    const blurred = new cv.Mat()
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)

    // Edge detection using Canny
    const edges = new cv.Mat()
    cv.Canny(blurred, edges, 50, 150)

    // Find contours
    const contours = new cv.MatVector()
    const hierarchy = new cv.Mat()
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    // Find the largest contour that approximates to a quadrilateral
    let maxArea = 0
    let bestContour = null

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i)
      const area = cv.contourArea(contour)

      // Skip small contours (less than 10% of image area)
      if (area < src.rows * src.cols * 0.1) {
        continue
      }

      // Approximate contour to polygon
      const peri = cv.arcLength(contour, true)
      const approx = new cv.Mat()
      cv.approxPolyDP(contour, approx, 0.02 * peri, true)

      // Check if it's a quadrilateral (4 points)
      if (approx.rows === 4 && area > maxArea) {
        maxArea = area
        if (bestContour) bestContour.delete()
        bestContour = approx.clone()
      }
      approx.delete()
    }

    // Cleanup
    gray.delete()
    blurred.delete()
    edges.delete()
    contours.delete()
    hierarchy.delete()

    return bestContour
  }

  const orderPoints = (pts: any): Point[] => {
    // Order points: top-left, top-right, bottom-right, bottom-left
    const rect = []
    for (let i = 0; i < 4; i++) {
      rect.push({ x: pts.data32S[i * 2], y: pts.data32S[i * 2 + 1] })
    }

    // Sort by y coordinate
    rect.sort((a, b) => a.y - b.y)

    // Top two points
    const top = rect.slice(0, 2).sort((a, b) => a.x - b.x)
    // Bottom two points
    const bottom = rect.slice(2, 4).sort((a, b) => a.x - b.x)

    return [top[0], top[1], bottom[1], bottom[0]] // tl, tr, br, bl
  }

  const pointsArrayToCorners = (pts: Point[]): Point[] => {
    return pts
  }

  const cornersToMat = (corners: Point[], cv: any) => {
    return cv.matFromArray(4, 1, cv.CV_32FC2, [
      corners[0].x,
      corners[0].y,
      corners[1].x,
      corners[1].y,
      corners[2].x,
      corners[2].y,
      corners[3].x,
      corners[3].y,
    ])
  }

  const applyPerspectiveTransform = (src: any, corners: Point[], cv: any) => {
    // Calculate width and height of the new image
    const widthA = Math.sqrt(
      Math.pow(corners[2].x - corners[3].x, 2) + Math.pow(corners[2].y - corners[3].y, 2)
    )
    const widthB = Math.sqrt(
      Math.pow(corners[1].x - corners[0].x, 2) + Math.pow(corners[1].y - corners[0].y, 2)
    )
    const maxWidth = Math.max(widthA, widthB)

    const heightA = Math.sqrt(
      Math.pow(corners[1].x - corners[2].x, 2) + Math.pow(corners[1].y - corners[2].y, 2)
    )
    const heightB = Math.sqrt(
      Math.pow(corners[0].x - corners[3].x, 2) + Math.pow(corners[0].y - corners[3].y, 2)
    )
    const maxHeight = Math.max(heightA, heightB)

    // Source and destination points
    const srcPoints = cornersToMat(corners, cv)

    const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0,
      0,
      maxWidth - 1,
      0,
      maxWidth - 1,
      maxHeight - 1,
      0,
      maxHeight - 1,
    ])

    // Get perspective transform matrix
    const M = cv.getPerspectiveTransform(srcPoints, dstPoints)

    // Apply perspective transform
    const warped = new cv.Mat()
    cv.warpPerspective(src, warped, M, new cv.Size(maxWidth, maxHeight))

    // Cleanup
    srcPoints.delete()
    dstPoints.delete()
    M.delete()

    return warped
  }

  const detectPaperCorners = async (imageDataUrl: string): Promise<Point[] | null> => {
    return new Promise((resolve, reject) => {
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

          // Detect paper contour
          const paperContour = detectPaperContour(src, cv)

          if (paperContour) {
            const corners = orderPoints(paperContour)
            paperContour.delete()
            src.delete()
            resolve(corners)
          } else {
            src.delete()
            resolve(null)
          }
        } catch (error) {
          reject(error)
        }
      }
      img.onerror = reject
      img.src = imageDataUrl
    })
  }

  const processImageWithCorners = async (imageDataUrl: string, corners: Point[] | null) => {
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
          let processedImage = src

          // If corners are provided, apply perspective transform
          if (corners) {
            console.log('Applying perspective transform with corners:', corners)
            processedImage = applyPerspectiveTransform(src, corners, cv)
            src.delete()
          } else {
            console.log('No corners provided, using original image')
          }

          // Color correction (histogram equalization)
          let corrected = new cv.Mat()
          if (processedImage.channels() === 1) {
            cv.equalizeHist(processedImage, corrected)
          } else {
            cv.cvtColor(processedImage, corrected, cv.COLOR_RGBA2RGB)
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
          processedImage.delete()
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
