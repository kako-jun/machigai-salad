/** Pure utility functions for image processing (no React dependency) */

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

interface GifSource {
  /** The comparison canvas element (already has the warped left image) */
  leftCanvas: HTMLCanvasElement
  /** Image rect within the canvas (CSS pixels, for cropping) */
  imgRect: { w: number; h: number; left: number; top: number }
  /** Right image data URL */
  rightDataUrl: string
}

/**
 * Generate an animated GIF by capturing the comparison canvas directly.
 * Frame 1: right image + left canvas (exactly what the user sees)
 * Frame 2: right image only
 */
export function generateToggleGif(source: GifSource, delay: number): Promise<Blob> {
  const { leftCanvas, imgRect, rightDataUrl } = source

  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = rightDataUrl
  }).then((rightImg) => {
    const w = rightImg.width
    const h = rightImg.height
    const scale = Math.min(1, GIF_MAX_DIM / Math.max(w, h))
    const gw = Math.round(w * scale)
    const gh = Math.round(h * scale)

    const canvas = document.createElement('canvas')
    canvas.width = gw
    canvas.height = gh
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context unavailable')

    const dpr = window.devicePixelRatio || 1

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

          // Frame 1: right image + left canvas (pixel-perfect capture)
          ctx.drawImage(rightImg, 0, 0, gw, gh)
          // DEBUG: red border to verify this code is running
          ctx.strokeStyle = 'red'
          ctx.lineWidth = 4
          ctx.strokeRect(2, 2, gw - 4, gh - 4)
          // Crop the image area from the comparison canvas (DPR-scaled physical pixels)
          ctx.drawImage(
            leftCanvas,
            imgRect.left * dpr,
            imgRect.top * dpr,
            imgRect.w * dpr,
            imgRect.h * dpr,
            0,
            0,
            gw,
            gh
          )
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
  })
}
