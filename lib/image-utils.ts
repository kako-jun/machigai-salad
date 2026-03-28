/** Pure utility functions for image processing (no React dependency) */

/** Maximum image dimension (longest side) in physical pixels */
const MAX_IMAGE_DIM = 2400

/** APNG share image max dimension */
const APNG_MAX_DIM = 480

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
      resolve(canvas.toDataURL('image/webp', 0.92))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

/**
 * Generate an animated PNG (APNG) that toggles between left and right images.
 * Infinite loop. Full color (lossless).
 */
export async function generateToggleApng(
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

  const [leftImg, rightImg] = await Promise.all([loadImg(leftDataUrl), loadImg(rightDataUrl)])

  const w = leftImg.width
  const h = leftImg.height
  const scale = Math.min(1, APNG_MAX_DIM / Math.max(w, h))
  const gw = Math.round(w * scale)
  const gh = Math.round(h * scale)

  const canvas = document.createElement('canvas')
  canvas.width = gw
  canvas.height = gh
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable')

  ctx.drawImage(leftImg, 0, 0, gw, gh)
  const leftData = ctx.getImageData(0, 0, gw, gh).data.buffer.slice(0)

  ctx.drawImage(rightImg, 0, 0, gw, gh)
  const rightData = ctx.getImageData(0, 0, gw, gh).data.buffer.slice(0)

  const upngModule = await import('upng-js')
  // CJS/ESM interop: module.exports may be under .default
  const UPNG = (upngModule as unknown as { default?: typeof upngModule }).default || upngModule
  const apngBuffer = UPNG.encode(
    [leftData, rightData],
    gw,
    gh,
    0, // 0 = lossless full color
    [delay, delay]
  )

  return new Blob([apngBuffer], { type: 'image/png' })
}
