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

/**
 * Generate an animated GIF that toggles between left and right images.
 * Infinite loop, Floyd-Steinberg dithering for better quality.
 */
export function generateToggleGif(
  leftDataUrl: string,
  rightDataUrl: string,
  delay: number
): Promise<Blob> {
  const loadImg = (src: string) =>
    new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image()
      img.onload = () => res(img)
      img.onerror = rej
      img.src = src
    })

  return Promise.all([loadImg(leftDataUrl), loadImg(rightDataUrl)]).then(([leftImg, rightImg]) => {
    const w = leftImg.width
    const h = leftImg.height
    const scale = Math.min(1, GIF_MAX_DIM / Math.max(w, h))
    const gw = Math.round(w * scale)
    const gh = Math.round(h * scale)

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

          ctx.drawImage(leftImg, 0, 0, gw, gh)
          gif.addFrame(ctx, { delay, copy: true })

          ctx.drawImage(rightImg, 0, 0, gw, gh)
          gif.addFrame(ctx, { delay, copy: true })

          gif.on('finished', resolve)
          gif.render()

          setTimeout(() => reject(new Error('GIF generation timed out')), 30000)
        })
    )
  })
}
