/** Pure utility functions for image processing (no React dependency) */

import type { Point, CornerOffsets } from '@/types'
import { drawMeshWarp } from '@/lib/mesh-warp'

/** Maximum image dimension (longest side) in physical pixels */
const MAX_IMAGE_DIM = 2400

/** GIF share image max dimension */
const GIF_MAX_DIM = 480

/** APNG download image max dimension (higher quality than GIF) */
const APNG_MAX_DIM = 800

/**
 * Convert a URL (data: or blob:) to a Blob.
 * - data: URLs use an atob-based fast path (CSP-friendly — no `fetch`).
 * - blob: URLs fall through to `fetch` so restored saves (where the source
 *   is an object URL backed by an IDB Blob) can be re-saved without errors.
 */
export async function dataUrlToBlob(url: string): Promise<Blob> {
  if (url.startsWith('blob:')) {
    const res = await fetch(url)
    return await res.blob()
  }
  const [header, data] = url.split(',')
  const mimeMatch = header.match(/^data:([^;,]+)(?:;[^,]*?)?;base64$/i)
  if (!mimeMatch) throw new Error('Invalid data URL')
  const mime = mimeMatch[1]
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

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

export interface AnimationSource {
  /** Left image data URL */
  leftDataUrl: string
  /** Right image data URL */
  rightDataUrl: string
  /** Display image rect in CSS pixels (for scaling warp params to output space) */
  displaySize: { w: number; h: number }
  /** Slide offset in CSS display pixels */
  offset: { x: number; y: number }
  /** 4 corner warp offsets in CSS display pixels */
  cornerOffsets: CornerOffsets
  /** Center warp offset in CSS display pixels */
  centerOffset: Point
}

/**
 * Generate animation frames at the given max dimension.
 * Returns raw ImageData for each frame (frame 1: overlay, frame 2: right only).
 */
async function generateFrames(
  source: AnimationSource,
  maxDim: number
): Promise<{ frames: ImageData[]; width: number; height: number }> {
  const { leftDataUrl, rightDataUrl, displaySize, offset, cornerOffsets, centerOffset } = source
  const [leftImg, rightImg] = await Promise.all([loadImage(leftDataUrl), loadImage(rightDataUrl)])

  const w = rightImg.width
  const h = rightImg.height
  const scale = Math.min(1, maxDim / Math.max(w, h))
  const gw = Math.round(w * scale)
  const gh = Math.round(h * scale)

  // Scale warp parameters from CSS display pixels to output pixels
  const sx = gw / displaySize.w
  const sy = gh / displaySize.h

  const scaledOffset = { x: offset.x * sx, y: offset.y * sy }
  const scaledCornerOffsets = cornerOffsets.map((c) => ({
    x: c.x * sx,
    y: c.y * sy,
  })) as unknown as CornerOffsets
  const scaledCenterOffset = { x: centerOffset.x * sx, y: centerOffset.y * sy }

  const canvas = document.createElement('canvas')
  canvas.width = gw
  canvas.height = gh
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable')

  // Frame 1: right image + mesh-warped left image
  ctx.drawImage(rightImg, 0, 0, gw, gh)
  drawMeshWarp(ctx, leftImg, gw, gh, {
    cornerOffsets: scaledCornerOffsets,
    centerOffset: scaledCenterOffset,
    offset: scaledOffset,
    imgLeft: 0,
    imgTop: 0,
  })
  const frame1 = ctx.getImageData(0, 0, gw, gh)

  // Frame 2: right image only
  ctx.clearRect(0, 0, gw, gh)
  ctx.drawImage(rightImg, 0, 0, gw, gh)
  const frame2 = ctx.getImageData(0, 0, gw, gh)

  // Release canvas memory
  canvas.width = 0
  canvas.height = 0

  return { frames: [frame1, frame2], width: gw, height: gh }
}

/**
 * Generate an animated GIF (for sharing — compact, high compatibility).
 * @param delay Frame interval in milliseconds
 */
export async function generateToggleGif(source: AnimationSource, delay: number): Promise<Blob> {
  const { frames, width, height } = await generateFrames(source, GIF_MAX_DIM)

  // CJS interop: gif.js uses module.exports, webpack wraps it in .default
  const mod = await import('gif.js')
  const GIF = ((mod as Record<string, unknown>).default || mod) as new (
    opts: Record<string, unknown>
  ) => { addFrame: Function; on: Function; render: Function; abort: Function }

  return new Promise<Blob>((resolve, reject) => {
    const gif = new GIF({
      workers: 2,
      quality: 1,
      width,
      height,
      workerScript: '/static/gif.worker.js',
      repeat: 0,
      dither: false,
    })

    gif.addFrame(frames[0], { delay })
    gif.addFrame(frames[1], { delay })

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

/**
 * Generate an animated PNG (for download — higher quality, larger dimensions).
 * @param delay Frame interval in milliseconds
 */
export async function generateToggleApng(source: AnimationSource, delay: number): Promise<Blob> {
  const { frames, width, height } = await generateFrames(source, APNG_MAX_DIM)
  const UPNG = await import('upng-js')

  const bufs = frames.map((f) => f.data.buffer as ArrayBuffer)
  const apngData = UPNG.encode(bufs, width, height, 0, [delay, delay])
  return new Blob([apngData], { type: 'image/png' })
}
