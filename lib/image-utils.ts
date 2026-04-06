/** Pure utility functions for image processing (no React dependency) */

import type { Point, CornerOffsets } from '@/types'
import { drawMeshWarp } from '@/lib/mesh-warp'

/** Maximum image dimension (longest side) in physical pixels */
const MAX_IMAGE_DIM = 2400

/** GIF share image max dimension */
const GIF_MAX_DIM = 480

export function getImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = reject
    img.src = dataUrl
  })
}

/**
 * Resize an image data URL so its longest side does not exceed maxDim physical pixels.
 * Uses the display's devicePixelRatio to determine the practical upper bound,
 * capped at MAX_IMAGE_DIM. Returns the original if already small enough.
 */
export function resizeImage(dataUrl: string, width: number, height: number): Promise<string> {
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
      // Prefer WebP, fall back to JPEG if browser doesn't support WebP canvas export
      const webp = canvas.toDataURL('image/webp', 0.92)
      resolve(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.92))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

interface GifSource {
  /** Left image data URL */
  leftDataUrl: string
  /** Right image data URL */
  rightDataUrl: string
  /** Display image rect in CSS pixels (for scaling warp params to GIF space) */
  displaySize: { w: number; h: number }
  /** Slide offset in CSS display pixels */
  offset: { x: number; y: number }
  /** 4 corner warp offsets in CSS display pixels */
  cornerOffsets: CornerOffsets
  /** Center warp offset in CSS display pixels */
  centerOffset: Point
}

/**
 * Generate an animated GIF by rendering both images independently.
 * No dependency on the display canvas — renders at image native resolution.
 * Frame 1: right image + mesh-warped left image
 * Frame 2: right image only
 */
export function generateToggleGif(source: GifSource, delay: number): Promise<Blob> {
  const { leftDataUrl, rightDataUrl, displaySize, offset, cornerOffsets, centerOffset } = source

  return Promise.all([loadImage(leftDataUrl), loadImage(rightDataUrl)]).then(
    ([leftImg, rightImg]) => {
      const w = rightImg.width
      const h = rightImg.height
      const scale = Math.min(1, GIF_MAX_DIM / Math.max(w, h))
      const gw = Math.round(w * scale)
      const gh = Math.round(h * scale)

      // Scale warp parameters from CSS display pixels to GIF pixels
      const sx = gw / displaySize.w
      const sy = gh / displaySize.h

      const gifOffset = { x: offset.x * sx, y: offset.y * sy }
      const gifCornerOffsets = cornerOffsets.map((c) => ({
        x: c.x * sx,
        y: c.y * sy,
      })) as unknown as CornerOffsets
      const gifCenterOffset = { x: centerOffset.x * sx, y: centerOffset.y * sy }

      const canvas = document.createElement('canvas')
      canvas.width = gw
      canvas.height = gh
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context unavailable')

      return import('gif.js').then(
        // CJS interop: gif.js uses module.exports, webpack wraps it in .default
        (mod) => {
          const GIF = ((mod as Record<string, unknown>).default || mod) as new (
            opts: Record<string, unknown>
          ) => { addFrame: Function; on: Function; render: Function; abort: Function }
          return new Promise<Blob>((resolve, reject) => {
            const gif = new GIF({
              workers: 2,
              quality: 1,
              width: gw,
              height: gh,
              workerScript: '/static/gif.worker.js',
              repeat: 0,
              dither: false,
            })

            // Frame 1: right image + mesh-warped left image
            ctx.drawImage(rightImg, 0, 0, gw, gh)
            drawMeshWarp(ctx, leftImg, gw, gh, {
              cornerOffsets: gifCornerOffsets,
              centerOffset: gifCenterOffset,
              offset: gifOffset,
              imgLeft: 0,
              imgTop: 0,
            })
            gif.addFrame(ctx, { delay, copy: true })

            // Frame 2: right image only
            ctx.clearRect(0, 0, gw, gh)
            ctx.drawImage(rightImg, 0, 0, gw, gh)
            gif.addFrame(ctx, { delay, copy: true })

            const timer = setTimeout(() => {
              gif.abort()
              reject(new Error('GIF generation timed out'))
            }, 30000)
            gif.on('finished', (blob: Blob) => {
              clearTimeout(timer)
              resolve(blob)
            })
            gif.render()
          })
        }
      )
    }
  )
}
