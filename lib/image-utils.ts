/** Pure utility functions for image processing (no React dependency) */

import type { CornerOffsets } from '@/types'

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
      ({ default: GIF }) =>
        new Promise<Blob>((resolve, reject) => {
          const gif = new GIF({
            workers: 2,
            quality: 1,
            width: gw,
            height: gh,
            workerScript: '/static/gif.worker.js',
            repeat: 0,
            dither: 'FloydSteinberg',
          })

          // Frame 1: left image with offset (what user sees normally)
          ctx.drawImage(rightImg, 0, 0, gw, gh)
          ctx.save()
          ctx.translate(ox, oy)
          // Apply perspective warp if provided
          if (options?.warpCorners) {
            applyPerspectiveToCanvas(ctx, gw, gh, options.warpCorners, scale)
          }
          ctx.drawImage(leftImg, 0, 0, gw, gh)
          ctx.restore()
          gif.addFrame(ctx, { delay, copy: true })

          // Frame 2: right image only (what user sees when holding)
          ctx.clearRect(0, 0, gw, gh)
          ctx.drawImage(rightImg, 0, 0, gw, gh)
          gif.addFrame(ctx, { delay, copy: true })

          gif.on('finished', resolve)
          gif.render()

          setTimeout(() => reject(new Error('GIF generation timed out')), 30000)
        })
    )
  })
}

/**
 * Approximate perspective warp using canvas 2D setTransform (affine approximation).
 * For small corner offsets (±30px) this is visually close enough.
 */
function applyPerspectiveToCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  corners: CornerOffsets,
  scale: number
) {
  // Scale corner offsets
  const c = corners.map((p) => ({ x: p.x * scale, y: p.y * scale }))

  // Compute affine approximation from the 4 corner offsets
  // Use top-left and top-right for horizontal skew, top-left and bottom-left for vertical
  const avgDx = (c[0].x + c[1].x + c[2].x + c[3].x) / 4
  const avgDy = (c[0].y + c[1].y + c[2].y + c[3].y) / 4

  // Horizontal scale from left-right difference
  const scaleX = 1 + (c[1].x - c[0].x + c[2].x - c[3].x) / (2 * w)
  // Vertical scale from top-bottom difference
  const scaleY = 1 + (c[3].y - c[0].y + c[2].y - c[1].y) / (2 * h)
  // Horizontal skew
  const skewX = (c[3].x - c[0].x + c[2].x - c[1].x) / (2 * h)
  // Vertical skew
  const skewY = (c[1].y - c[0].y + c[2].y - c[3].y) / (2 * w)

  ctx.transform(scaleX, skewY, skewX, scaleY, avgDx, avgDy)
}
