'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Point, OpenCV } from '@/types'
import {
  detectPaperContour,
  orderPoints,
  applyPerspectiveTransform,
  applyColorCorrection,
  splitImage,
} from '@/lib/opencv'

const OPENCV_CDN_URL = 'https://docs.opencv.org/4.9.0/opencv.js'

interface UseOpenCVReturn {
  cvLoaded: boolean
  suggestCorners: (imageDataUrl: string) => Promise<Point[] | null>
  processImage: (imageDataUrl: string, corners: Point[]) => Promise<ProcessedImages>
}

interface ProcessedImages {
  leftImage: string
  rightImage: string
}

/**
 * OpenCV.jsをロードして画像処理機能を提供するカスタムフック
 */
export function useOpenCV(): UseOpenCVReturn {
  const [cvLoaded, setCvLoaded] = useState(false)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = OPENCV_CDN_URL
    script.async = true
    script.onload = () => {
      if (window.cv) {
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

  /**
   * 画像から紙の4つの角を自動検出する（提案として返す）
   * 検出に失敗した場合はnullを返す。呼び出し側はnullでもフローを止めない
   */
  const suggestCorners = useCallback(
    async (imageDataUrl: string): Promise<Point[] | null> => {
      if (!cvLoaded) {
        await waitForCvLoaded()
      }

      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          try {
            const cv = window.cv

            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0)

            const src = cv.imread(canvas)
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
            // Auto-detection failure is not critical; return null
            console.warn('Auto-detection failed:', error)
            resolve(null)
          }
        }
        img.onerror = reject
        img.src = imageDataUrl
      })
    },
    [cvLoaded]
  )

  /**
   * 指定された角座標で画像を処理し、左右に分割する
   * corners は必須（ユーザーが確認済みの角座標）
   */
  const processImage = useCallback(
    async (imageDataUrl: string, corners: Point[]): Promise<ProcessedImages> => {
      if (!cvLoaded) {
        await waitForCvLoaded()
      }

      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          try {
            const cv = window.cv

            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0)

            const src = cv.imread(canvas)

            // 透視変換を適用
            const warped = applyPerspectiveTransform(src, corners, cv)
            src.delete()

            // 色調補正
            const corrected = applyColorCorrection(warped, cv)
            warped.delete()

            // 左右分割
            const [leftMat, rightMat] = splitImage(corrected, cv)

            // Canvasに出力
            const leftCanvas = document.createElement('canvas')
            cv.imshow(leftCanvas, leftMat)
            const leftImage = leftCanvas.toDataURL()

            const rightCanvas = document.createElement('canvas')
            cv.imshow(rightCanvas, rightMat)
            const rightImage = rightCanvas.toDataURL()

            // クリーンアップ
            corrected.delete()
            leftMat.delete()
            rightMat.delete()

            resolve({ leftImage, rightImage })
          } catch (error) {
            reject(error)
          }
        }
        img.onerror = reject
        img.src = imageDataUrl
      })
    },
    [cvLoaded]
  )

  return { cvLoaded, suggestCorners, processImage }
}

/**
 * OpenCV.jsのロードを待機するヘルパー
 */
function waitForCvLoaded(): Promise<void> {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (window.cv) {
        clearInterval(interval)
        resolve()
      }
    }, 100)
  })
}
