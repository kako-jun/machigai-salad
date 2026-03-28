/** Pure utility functions for image processing (no React dependency) */

import type { CornerOffsets } from '@/types'
import { drawMeshWarp } from './mesh-warp'

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

interface GifOptions {
  offset?: { x: number; y: number }
  warpCorners?: CornerOffsets
  centerOffset?: { x: number; y: number }
}

/**
 * Generate an animated GIF that toggles between left and right images.
 * Frame 1: right image + left image overlaid with offset/warp (what user sees normally)
 * Frame 2: right image only (what user sees when holding)
 */
export function generateToggleGif(
  leftDataUrl: string,
  rightDataUrl: string,
  delay: number,
  options?: GifOptions
): Promise<Blob> {
  const loadImg = (src: string) =>
    new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image()
      img.onload = () => res(img)
      img.onerror = rej
      img.src = src
    })

  return Promise.all([loadImg(leftDataUrl), loadImg(rightDataUrl)]).then(([leftImg, rightImg]) => {
    const w = rightImg.width
    const h = rightImg.height
    const scale = Math.min(1, GIF_MAX_DIM / Math.max(w, h))
    const gw = Math.round(w * scale)
    const gh = Math.round(h * scale)

    const ox = (options?.offset?.x ?? 0) * scale
    const oy = (options?.offset?.y ?? 0) * scale

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
            dither: 'FloydSteinberg',
          })

          // Frame 1: right image + left image with mesh warp
          ctx.drawImage(rightImg, 0, 0, gw, gh)
          const warpCorners = options?.warpCorners
          const centerOff = options?.centerOffset
          drawMeshWarp(ctx, leftImg, gw, gh, {
            cornerOffsets: warpCorners
              ? (warpCorners.map((c) => ({
                  x: c.x * scale,
                  y: c.y * scale,
                })) as unknown as CornerOffsets)
              : ([
                  { x: 0, y: 0 },
                  { x: 0, y: 0 },
                  { x: 0, y: 0 },
                  { x: 0, y: 0 },
                ] as CornerOffsets),
            centerOffset: centerOff
              ? { x: centerOff.x * scale, y: centerOff.y * scale }
              : { x: 0, y: 0 },
            offset: { x: ox, y: oy },
            imgLeft: 0,
            imgTop: 0,
          })
          gif.addFrame(ctx, { delay, copy: true })

          // Frame 2: right image only (what user sees when holding)
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
  })
}
