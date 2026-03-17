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
    let mounted = true

    const script = document.createElement('script')
    script.src = OPENCV_CDN_URL
    script.async = true
    script.onload = () => {
      // cv オブジェクトがすでに存在しWASM初期化済みの場合は即座に完了
      if (window.cv && window.cv.Mat) {
        if (mounted) {
          setCvLoaded(true)
        }
        return
      }
      // WASMの初期化完了を待つ
      if (window.cv) {
        const prev = window.cv.onRuntimeInitialized
        window.cv.onRuntimeInitialized = () => {
          if (prev) prev()
          if (mounted) {
            setCvLoaded(true)
          }
        }
      }
    }
    document.body.appendChild(script)

    return () => {
      mounted = false
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
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
          let src = null
          let paperContour = null
          try {
            const cv = window.cv

            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0)

            src = cv.imread(canvas)
            paperContour = detectPaperContour(src, cv)

            if (paperContour) {
              const corners = orderPoints(paperContour)
              paperContour.delete()
              paperContour = null
              src.delete()
              src = null
              resolve(corners)
            } else {
              src.delete()
              src = null
              resolve(null)
            }
          } catch (error) {
            // 確保済みのMatを確実に解放してからnullを返す
            if (paperContour) {
              try {
                paperContour.delete()
              } catch (_) {}
            }
            if (src) {
              try {
                src.delete()
              } catch (_) {}
            }
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
          let src = null
          let warped = null
          let corrected = null
          let leftMat = null
          let rightMat = null
          try {
            const cv = window.cv

            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0)

            src = cv.imread(canvas)

            // 透視変換を適用
            warped = applyPerspectiveTransform(src, corners, cv)
            src.delete()
            src = null

            // 色調補正
            corrected = applyColorCorrection(warped, cv)
            warped.delete()
            warped = null

            // 左右分割
            ;[leftMat, rightMat] = splitImage(corrected, cv)

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
            // 確保済みのMatを確実に解放してからエラーを返す
            if (rightMat)
              try {
                rightMat.delete()
              } catch (_) {}
            if (leftMat)
              try {
                leftMat.delete()
              } catch (_) {}
            if (corrected)
              try {
                corrected.delete()
              } catch (_) {}
            if (warped)
              try {
                warped.delete()
              } catch (_) {}
            if (src)
              try {
                src.delete()
              } catch (_) {}
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
 * OpenCV.jsのWASM初期化完了を待機するヘルパー
 * タイムアウト10秒。超えた場合はエラーをスロー
 */
function waitForCvLoaded(): Promise<void> {
  return new Promise((resolve, reject) => {
    const TIMEOUT_MS = 10000
    const CHECK_INTERVAL_MS = 100
    let elapsed = 0

    const interval = setInterval(() => {
      // window.cv.Mat が存在すればWASM初期化完了
      if (window.cv && window.cv.Mat) {
        clearInterval(interval)
        resolve()
        return
      }
      elapsed += CHECK_INTERVAL_MS
      if (elapsed >= TIMEOUT_MS) {
        clearInterval(interval)
        reject(new Error('OpenCV.js の読み込みがタイムアウトしました'))
      }
    }, CHECK_INTERVAL_MS)
  })
}
