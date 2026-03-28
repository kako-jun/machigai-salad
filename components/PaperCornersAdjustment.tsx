'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Point } from '@/types'
import { useI18n } from '@/lib/i18n'

/** Minimum canvas dimension in CSS pixels — tiny images are scaled up to this */
const MIN_CANVAS_DIM = 280

interface PaperCornersAdjustmentProps {
  imageDataUrl: string
  /** 自動検出結果（nullの場合はデフォルト位置を使う） */
  initialCorners: Point[] | null
  /** 元画像のサイズ（デフォルト角の計算に使う） */
  imageSize: { width: number; height: number }
  onApply: (corners: Point[]) => void
  onCancel: () => void
  /** 感度を変えて再検出する。結果のcornersまたはnullを返す */
  onRedetect?: (sensitivity: 'strict' | 'normal' | 'loose') => Promise<Point[] | null>
}

function getDefaultCorners(imageSize: { width: number; height: number }): Point[] {
  const marginX = imageSize.width * 0.1
  const marginY = imageSize.height * 0.1
  return [
    { x: marginX, y: marginY },
    { x: imageSize.width - marginX, y: marginY },
    { x: imageSize.width - marginX, y: imageSize.height - marginY },
    { x: marginX, y: imageSize.height - marginY },
  ]
}

/** Trace a quadrilateral path from corners (shared by overlay, clip, border) */
function traceCornerPath(ctx: CanvasRenderingContext2D, corners: Point[], scale: number) {
  ctx.beginPath()
  corners.forEach((corner, i) => {
    const x = corner.x * scale
    const y = corner.y * scale
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
}

/** Module-level draw function — no component closure dependencies */
function drawCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  corners: Point[],
  scale: number,
  activeIndex: number | null,
  dpr: number
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const cssW = canvas.width / dpr
  const cssH = canvas.height / dpr

  // Apply DPR transform — all coordinates below are in CSS-pixel space
  ctx.save()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  ctx.clearRect(0, 0, cssW, cssH)
  ctx.drawImage(img, 0, 0, cssW, cssH)

  // Semi-transparent overlay outside the selected region
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
  ctx.fillRect(0, 0, cssW, cssH)

  // Cut out the selected region
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  traceCornerPath(ctx, corners, scale)
  ctx.fill()
  ctx.restore()

  // Redraw image inside the region
  ctx.save()
  traceCornerPath(ctx, corners, scale)
  ctx.clip()
  ctx.drawImage(img, 0, 0, cssW, cssH)
  ctx.restore()

  // Draw border lines
  ctx.strokeStyle = 'rgba(245, 197, 24, 0.85)'
  ctx.lineWidth = 2.5
  traceCornerPath(ctx, corners, scale)
  ctx.stroke()

  // Draw center dividing line (left/right split preview)
  // corners: [topLeft, topRight, bottomRight, bottomLeft]
  const topMidX = ((corners[0].x + corners[1].x) / 2) * scale
  const topMidY = ((corners[0].y + corners[1].y) / 2) * scale
  const bottomMidX = ((corners[3].x + corners[2].x) / 2) * scale
  const bottomMidY = ((corners[3].y + corners[2].y) / 2) * scale
  ctx.save()
  ctx.setLineDash([6, 4])
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(topMidX, topMidY)
  ctx.lineTo(bottomMidX, bottomMidY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  // Draw corner handles
  corners.forEach((corner, index) => {
    const x = corner.x * scale
    const y = corner.y * scale
    const isActive = activeIndex === index

    // Outer ring when active
    if (isActive) {
      ctx.strokeStyle = 'rgba(245, 197, 24, 0.4)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(x, y, 18, 0, 2 * Math.PI)
      ctx.stroke()
    }

    // Handle dot
    ctx.fillStyle = isActive ? '#D4A010' : '#F5C518'
    ctx.beginPath()
    ctx.arc(x, y, isActive ? 10 : 8, 0, 2 * Math.PI)
    ctx.fill()

    // White border
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(x, y, isActive ? 10 : 8, 0, 2 * Math.PI)
    ctx.stroke()
  })

  // Magnifier loupe — shown only while dragging
  if (activeIndex !== null) {
    const corner = corners[activeIndex]
    const cx = corner.x * scale
    const cy = corner.y * scale

    const LOUPE_RADIUS = 55
    const LOUPE_ZOOM = 3
    const LOUPE_MARGIN = LOUPE_RADIUS + 12

    // Position loupe in the diagonally opposite quadrant
    const midX = cssW / 2
    const midY = cssH / 2
    const loupeX = cx < midX ? cssW - LOUPE_MARGIN : LOUPE_MARGIN
    const loupeY = cy < midY ? cssH - LOUPE_MARGIN : LOUPE_MARGIN

    // Source region centered on the corner (image coordinates)
    const srcHalf = LOUPE_RADIUS / LOUPE_ZOOM / scale
    const srcFullX = corner.x - srcHalf
    const srcFullY = corner.y - srcHalf
    const srcFullSize = srcHalf * 2

    // Clamp source to image bounds on all four edges
    const clampedX = Math.max(0, srcFullX)
    const clampedY = Math.max(0, srcFullY)
    const clampedW = Math.min(img.width, srcFullX + srcFullSize) - clampedX
    const clampedH = Math.min(img.height, srcFullY + srcFullSize) - clampedY

    // Destination: offset proportionally to how much was clipped from each edge
    const dstMag = LOUPE_ZOOM * scale
    const dstX = loupeX - LOUPE_RADIUS + (clampedX - srcFullX) * dstMag
    const dstY = loupeY - LOUPE_RADIUS + (clampedY - srcFullY) * dstMag
    const dstW = clampedW * dstMag
    const dstH = clampedH * dstMag

    // Drop shadow
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetY = 2
    ctx.beginPath()
    ctx.arc(loupeX, loupeY, LOUPE_RADIUS, 0, 2 * Math.PI)
    ctx.fillStyle = '#FFF8E7'
    ctx.fill()
    ctx.restore()

    // Clip to circle and draw magnified image
    ctx.save()
    ctx.beginPath()
    ctx.arc(loupeX, loupeY, LOUPE_RADIUS, 0, 2 * Math.PI)
    ctx.clip()

    ctx.drawImage(img, clampedX, clampedY, clampedW, clampedH, dstX, dstY, dstW, dstH)

    // Crosshair at loupe center (always marks the corner position)
    ctx.strokeStyle = 'rgba(245, 197, 24, 0.9)'
    ctx.lineWidth = 1.5
    const CROSS_SIZE = 10
    ctx.beginPath()
    ctx.moveTo(loupeX - CROSS_SIZE, loupeY)
    ctx.lineTo(loupeX + CROSS_SIZE, loupeY)
    ctx.moveTo(loupeX, loupeY - CROSS_SIZE)
    ctx.lineTo(loupeX, loupeY + CROSS_SIZE)
    ctx.stroke()

    ctx.restore()

    // Loupe border ring
    ctx.strokeStyle = 'rgba(245, 197, 24, 0.85)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(loupeX, loupeY, LOUPE_RADIUS, 0, 2 * Math.PI)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(loupeX, loupeY, LOUPE_RADIUS + 2, 0, 2 * Math.PI)
    ctx.stroke()
  }

  ctx.restore() // restore the DPR transform
}

const SENSITIVITY_CYCLE = ['strict', 'normal', 'loose'] as const
const SENSITIVITY_LABELS: Record<string, { ja: string; en: string }> = {
  strict: { ja: 'きびしめ', en: 'Strict' },
  normal: { ja: 'ふつう', en: 'Normal' },
  loose: { ja: 'あまめ', en: 'Loose' },
}

export default function PaperCornersAdjustment({
  imageDataUrl,
  initialCorners,
  imageSize,
  onApply,
  onCancel,
  onRedetect,
}: PaperCornersAdjustmentProps) {
  const { t, lang } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loadedImageRef = useRef<HTMLImageElement | null>(null)
  const dprRef = useRef(1)
  const effectiveInitialCorners = initialCorners ?? getDefaultCorners(imageSize)
  const [corners, setCorners] = useState<Point[]>(effectiveInitialCorners)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const cornersHistoryRef = useRef<Point[][]>([])
  const [undoCount, setUndoCount] = useState(0)
  const [scale, setScale] = useState(1)
  const [sensitivityIndex, setSensitivityIndex] = useState(2) // 初期検出がnormal。次クリックでstrict(0)→normal(1)→loose(2)の順
  const [detecting, setDetecting] = useState(false)

  // 画像の読み込みとキャンバスサイズ設定
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const img = new Image()
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1
      dprRef.current = dpr

      const maxWidth = Math.min(800, window.innerWidth - 32)
      const maxHeight = Math.min(600, window.innerHeight - 200)
      const fitScale = Math.min(maxWidth / img.width, maxHeight / img.height)
      // Upscale tiny images so the canvas is at least MIN_CANVAS_DIM on the longer side
      const minScale = MIN_CANVAS_DIM / Math.max(img.width, img.height)
      const newScale = Math.max(Math.min(fitScale, 1), minScale)

      const cssW = img.width * newScale
      const cssH = img.height * newScale

      // Set canvas backing store to device-pixel resolution
      canvas.width = cssW * dpr
      canvas.height = cssH * dpr
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`

      loadedImageRef.current = img
      setScale(newScale)

      // Direct initial draw — avoids race when newScale equals the previous scale value
      drawCanvas(canvas, img, effectiveInitialCorners, newScale, null, dpr)
    }
    img.src = imageDataUrl
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageDataUrl])

  // Redraw on state changes (corners dragged, scale updated)
  useEffect(() => {
    const canvas = canvasRef.current
    const img = loadedImageRef.current
    if (!canvas || !img) return
    drawCanvas(canvas, img, corners, scale, draggingIndex, dprRef.current)
  }, [corners, draggingIndex, scale])

  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number): Point => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      // getBoundingClientRect returns CSS pixels — no DPR adjustment needed
      const rect = canvas.getBoundingClientRect()
      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      }
    },
    [scale]
  )

  const findCornerAtPoint = useCallback(
    (point: Point): number | null => {
      const threshold = 25 / scale
      for (let i = 0; i < corners.length; i++) {
        const dx = corners[i].x - point.x
        const dy = corners[i].y - point.y
        if (Math.sqrt(dx * dx + dy * dy) < threshold) return i
      }
      return null
    },
    [corners, scale]
  )

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e.clientX, e.clientY)
    const index = findCornerAtPoint(point)
    if (index !== null) {
      pushCornersHistory()
      setDraggingIndex(index)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingIndex === null) return

    const point = getCanvasPoint(e.clientX, e.clientY)
    point.x = Math.max(0, Math.min(imageSize.width, point.x))
    point.y = Math.max(0, Math.min(imageSize.height, point.y))

    const newCorners = [...corners]
    newCorners[draggingIndex] = point
    setCorners(newCorners)
  }

  const handleMouseUp = () => {
    setDraggingIndex(null)
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const touch = e.touches[0]
    const point = getCanvasPoint(touch.clientX, touch.clientY)
    const index = findCornerAtPoint(point)
    if (index !== null) {
      pushCornersHistory()
      setDraggingIndex(index)
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (draggingIndex === null) return

    const touch = e.touches[0]
    const point = getCanvasPoint(touch.clientX, touch.clientY)
    point.x = Math.max(0, Math.min(imageSize.width, point.x))
    point.y = Math.max(0, Math.min(imageSize.height, point.y))

    const newCorners = [...corners]
    newCorners[draggingIndex] = point
    setCorners(newCorners)
  }

  const handleTouchEnd = () => {
    setDraggingIndex(null)
  }

  const handleRedetect = async () => {
    if (!onRedetect || detecting) return
    pushCornersHistory()
    const nextIndex = (sensitivityIndex + 1) % SENSITIVITY_CYCLE.length
    setSensitivityIndex(nextIndex)
    const sensitivity = SENSITIVITY_CYCLE[nextIndex]
    setDetecting(true)
    try {
      const result = await onRedetect(sensitivity)
      if (result) {
        setCorners(result)
      } else {
        // 検出失敗 → デフォルト矩形にフォールバック
        setCorners(getDefaultCorners(imageSize))
      }
    } finally {
      setDetecting(false)
    }
  }

  const pushCornersHistory = () => {
    const stack = cornersHistoryRef.current
    stack.push(corners.map((c) => ({ ...c })))
    if (stack.length > 50) stack.splice(0, stack.length - 50)
    setUndoCount(stack.length)
  }

  const handleUndo = () => {
    const prev = cornersHistoryRef.current.pop()
    if (prev) {
      setCorners(prev)
      setUndoCount(cornersHistoryRef.current.length)
    }
  }

  const handleApply = () => {
    onApply(corners)
  }

  return (
    <div className="animate-fade-in space-y-4">
      {/* Instruction tip styled like a menu note */}
      <div
        className="flex items-center justify-between rounded-xl px-4 py-2.5"
        style={{
          background: 'rgba(245,197,24,0.1)',
          border: '1px solid rgba(212,160,16,0.3)',
        }}
      >
        <p className="whitespace-pre-line text-sm font-medium" style={{ color: 'var(--muted)' }}>
          {t('cornersInstruction')}
        </p>
        {onRedetect && (
          <button
            onClick={handleRedetect}
            disabled={detecting}
            className="relative ml-2 flex-shrink-0 rounded-lg px-2 py-1 text-center text-xs leading-tight"
            style={{
              color: 'var(--muted)',
              border: '1px solid var(--border-light)',
            }}
          >
            {/* 常にテキストを描画して幅を確保。検出中は非表示にして...を重ねる */}
            <span style={{ visibility: detecting ? 'hidden' : 'visible' }}>
              {t('redetect')}
              <br />
              <span style={{ opacity: 0.7 }}>
                （
                {
                  SENSITIVITY_LABELS[
                    SENSITIVITY_CYCLE[(sensitivityIndex + 1) % SENSITIVITY_CYCLE.length]
                  ][lang]
                }
                ）
              </span>
            </span>
            {detecting && (
              <span className="absolute inset-0 flex items-center justify-center">...</span>
            )}
          </button>
        )}
      </div>

      {/* Canvas with placemat-style frame */}
      <div className="flex justify-center">
        <div
          className="inline-flex p-1"
          style={{
            background: 'linear-gradient(145deg, #FFF8E7, #FDF3D8)',
            border: '2px solid var(--border)',
            borderRadius: 16,
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.8) inset, 0 -1px 0 rgba(180,130,60,0.2) inset, 0 4px 16px rgba(60,36,21,0.12)',
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="cursor-pointer"
            style={{ touchAction: 'none', borderRadius: 10 }}
          />
        </div>
      </div>

      {/* Button row */}
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-ghost flex-1 px-4 py-3 text-sm">
          {t('cornersCancel')}
        </button>
        <button
          onClick={handleUndo}
          disabled={undoCount === 0}
          className="btn-ghost flex items-center justify-center gap-1 px-3 py-3 text-sm"
          style={{ opacity: undoCount === 0 ? 0.35 : 1 }}
        >
          <UndoIcon size={14} />
          {t('undo')}
        </button>
        <button onClick={handleApply} className="btn-action flex-[1.5] px-4 py-3 text-sm">
          {t('cornersOk')}
        </button>
      </div>
    </div>
  )
}

export function UndoIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
}
