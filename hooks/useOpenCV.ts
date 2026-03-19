'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Point, OpenCV } from '@/types'
import {
  detectPaperContour,
  orderPoints,
  applyPerspectiveTransform,
  splitImage,
} from '@/lib/opencv'

const OPENCV_CDN_URLS = [
  'https://docs.opencv.org/4.9.0/opencv.js',
  'https://cdn.jsdelivr.net/npm/opencv.js@1.2.1/opencv.js',
]

const LOAD_TIMEOUT_MS = 30000

type LoadState = 'loading' | 'ready' | 'error'

interface UseOpenCVReturn {
  cvLoaded: boolean
  loadState: LoadState
  loadError: string | null
  retryLoad: () => void
  suggestCorners: (imageDataUrl: string) => Promise<Point[] | null>
  processImage: (imageDataUrl: string, corners: Point[]) => Promise<ProcessedImages>
}

interface ProcessedImages {
  leftImage: string
  rightImage: string
}

/**
 * OpenCV.jsをロードして画像処理機能を提供するカスタムフック
 * CDNフォールバック・タイムアウト検出・リトライ機能付き
 */
export function useOpenCV(): UseOpenCVReturn {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const scriptRef = useRef<HTMLScriptElement | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (scriptRef.current && document.body.contains(scriptRef.current)) {
      document.body.removeChild(scriptRef.current)
      scriptRef.current = null
    }
  }, [])

  const attemptLoad = useCallback(
    (cdnIndex = 0) => {
      if (!mountedRef.current) return

      // Already loaded from a previous attempt
      if (window.cv && window.cv.Mat) {
        setLoadState('ready')
        setLoadError(null)
        return
      }

      cleanup()
      setLoadState('loading')
      setLoadError(null)

      const url = OPENCV_CDN_URLS[cdnIndex]
      if (!url) {
        // All CDNs exhausted
        if (mountedRef.current) {
          setLoadState('error')
          setLoadError('OpenCV.js の読み込みに失敗しました。ネットワーク接続を確認してください。')
        }
        return
      }

      const script = document.createElement('script')
      script.src = url
      script.async = true
      scriptRef.current = script

      // Timeout: try next CDN or fail
      timeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return
        console.warn(`OpenCV.js load timeout from ${url}, trying next CDN...`)
        cleanup()
        attemptLoad(cdnIndex + 1)
      }, LOAD_TIMEOUT_MS)

      const onReady = () => {
        if (!mountedRef.current) return
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        setLoadState('ready')
        setLoadError(null)
      }

      script.onload = () => {
        if (!mountedRef.current) return

        // cv object already fully initialized
        if (window.cv && window.cv.Mat) {
          onReady()
          return
        }

        // Wait for WASM initialization
        if (window.cv) {
          const prev = window.cv.onRuntimeInitialized
          window.cv.onRuntimeInitialized = () => {
            if (prev) prev()
            onReady()
          }
        }
      }

      script.onerror = () => {
        if (!mountedRef.current) return
        console.warn(`OpenCV.js failed to load from ${url}, trying next CDN...`)
        cleanup()
        attemptLoad(cdnIndex + 1)
      }

      document.body.appendChild(script)
    },
    [cleanup]
  )

  const retryLoad = useCallback(() => {
    attemptLoad(0)
  }, [attemptLoad])

  useEffect(() => {
    mountedRef.current = true
    attemptLoad(0)

    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [attemptLoad, cleanup])

  const cvLoaded = loadState === 'ready'

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

            // 左右分割（色は加工しない）
            ;[leftMat, rightMat] = splitImage(warped, cv)

            // Canvasに出力
            const leftCanvas = document.createElement('canvas')
            cv.imshow(leftCanvas, leftMat)
            const leftImage = leftCanvas.toDataURL()

            const rightCanvas = document.createElement('canvas')
            cv.imshow(rightCanvas, rightMat)
            const rightImage = rightCanvas.toDataURL()

            // クリーンアップ
            warped.delete()
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

  return { cvLoaded, loadState, loadError, retryLoad, suggestCorners, processImage }
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
