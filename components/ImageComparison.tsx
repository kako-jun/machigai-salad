'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { CornerOffsets } from '@/types'
import { MAX_UNDO } from '@/types'
import { useI18n } from '@/lib/i18n'
import { UndoIcon } from './icons'

/** Minimum pointer movement (px) to distinguish drag from hold */
const DRAG_THRESHOLD = 25
/** Maximum offset in each direction (px) */
const MAX_OFFSET = 40
/** Maximum corner warp offset (px) */
const MAX_CORNER_OFFSET = 30
/** Time (ms) to confirm hold — once confirmed, drag is disabled */
const HOLD_CONFIRM_MS = 200
/** Corner handle hit area radius (px) */
const CORNER_HIT_RADIUS = 22

const ZERO_CORNERS: CornerOffsets = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
]

/**
 * Compute CSS matrix3d for projective warp from rectangle to quad.
 * Maps (0,0)-(w,0)-(w,h)-(0,h) to (0+c0)-(w+c1)-(w+c2)-(0+c3)
 */
function computeMatrix3d(w: number, h: number, corners: CornerOffsets): string {
  const x0 = corners[0].x,
    y0 = corners[0].y
  const x1 = w + corners[1].x,
    y1 = corners[1].y
  const x2 = w + corners[2].x,
    y2 = h + corners[2].y
  const x3 = corners[3].x,
    y3 = h + corners[3].y

  const dx1 = x1 - x2
  const dx2 = x3 - x2
  const sx = x0 - x1 + x2 - x3
  const dy1 = y1 - y2
  const dy2 = y3 - y2
  const sy = y0 - y1 + y2 - y3

  const det = dx1 * dy2 - dx2 * dy1
  if (Math.abs(det) < 1e-10) return `matrix3d(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1)`

  const g = (sx * dy2 - dx2 * sy) / det
  const hh = (dx1 * sy - sx * dy1) / det

  const a = (x1 - x0 + g * x1) / w
  const b = (x3 - x0 + hh * x3) / h
  const c = x0
  const d = (y1 - y0 + g * y1) / w
  const e = (y3 - y0 + hh * y3) / h
  const f = y0
  const gw = g / w
  const hv = hh / h

  // CSS matrix3d in column-major order
  return `matrix3d(${a},${d},0,${gw}, ${b},${e},0,${hv}, 0,0,1,0, ${c},${f},0,1)`
}

interface ImageComparisonProps {
  leftImage: string
  rightImage: string
  initialOffset?: { x: number; y: number }
  onOffsetChange?: (offset: { x: number; y: number }) => void
  initialWarpCorners?: CornerOffsets
  onWarpChange?: (corners: CornerOffsets) => void
  onBackToAdjust?: () => void
}

export default function ImageComparison({
  leftImage,
  rightImage,
  initialOffset,
  onOffsetChange,
  initialWarpCorners,
  onWarpChange,
  onBackToAdjust,
}: ImageComparisonProps) {
  const { t } = useI18n()
  const [offset, _setOffset] = useState(initialOffset ?? { x: 0, y: 0 })
  const onOffsetChangeRef = useRef(onOffsetChange)
  onOffsetChangeRef.current = onOffsetChange
  const setOffset = useCallback((o: { x: number; y: number }) => {
    _setOffset(o)
    onOffsetChangeRef.current?.(o)
  }, [])
  const [isDragging, setIsDragging] = useState(false)
  const [isHolding, setIsHolding] = useState(false)
  const isDraggingRef = useRef(false)
  const isHoldConfirmedRef = useRef(false)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const offsetRef = useRef(offset)
  offsetRef.current = offset
  const startRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  // Corner warp state
  const [cornerOffsets, _setCornerOffsets] = useState<CornerOffsets>(
    initialWarpCorners ?? ZERO_CORNERS
  )
  const onWarpChangeRef = useRef(onWarpChange)
  onWarpChangeRef.current = onWarpChange
  const setCornerOffsets = useCallback((c: CornerOffsets) => {
    _setCornerOffsets(c)
    onWarpChangeRef.current?.(c)
  }, [])
  const [draggingCorner, setDraggingCorner] = useState<number | null>(null)
  const draggingCornerRef = useRef<number | null>(null)
  const cornerOffsetsRef = useRef(cornerOffsets)
  cornerOffsetsRef.current = cornerOffsets
  const cornerStartRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)

  // Undo history: snapshot of {offset, cornerOffsets} before each drag (max 50)
  const undoStackRef = useRef<{ offset: { x: number; y: number }; corners: CornerOffsets }[]>([])
  const [undoCount, setUndoCount] = useState(0) // trigger re-render for button opacity
  const pushUndo = useCallback(() => {
    const stack = undoStackRef.current
    stack.push({
      offset: { ...offsetRef.current },
      corners: cornerOffsetsRef.current.map((c) => ({ ...c })) as unknown as CornerOffsets,
    })
    if (stack.length > MAX_UNDO) stack.splice(0, stack.length - MAX_UNDO)
    setUndoCount(stack.length)
  }, [])

  // Image panel ref for measuring rendered image rect
  const panelRef = useRef<HTMLDivElement>(null)
  const [imgRect, setImgRect] = useState<{
    w: number
    h: number
    left: number
    top: number
  } | null>(null)

  // Measure rendered image position within the panel
  const measureImg = useCallback(() => {
    const panel = panelRef.current
    const img = panel?.querySelector('img')
    if (!panel || !img) return
    const panelRect = panel.getBoundingClientRect()
    const imgR = img.getBoundingClientRect()
    setImgRect({
      w: imgR.width,
      h: imgR.height,
      left: imgR.left - panelRect.left,
      top: imgR.top - panelRect.top,
    })
  }, [])

  useEffect(() => {
    measureImg()
    window.addEventListener('resize', measureImg)
    return () => window.removeEventListener('resize', measureImg)
  }, [measureImg, leftImage])

  // Image panel pointer handlers (hold/drag)
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const cur = offsetRef.current
    pushUndo()
    startRef.current = { x: e.clientX, y: e.clientY, ox: cur.x, oy: cur.y }
    isDraggingRef.current = false
    isHoldConfirmedRef.current = false
    setIsDragging(false)
    setIsHolding(true)

    holdTimerRef.current = setTimeout(() => {
      if (!isDraggingRef.current) {
        isHoldConfirmedRef.current = true
      }
    }, HOLD_CONFIRM_MS)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = startRef.current
      if (!start) return
      if (isHoldConfirmedRef.current) return

      const dx = e.clientX - start.x
      const dy = e.clientY - start.y

      if (!isDraggingRef.current && dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
        isDraggingRef.current = true
        setIsDragging(true)
        setIsHolding(false)
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current)
          holdTimerRef.current = null
        }
      }

      if (isDraggingRef.current) {
        setOffset({
          x: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, start.ox + dx)),
          y: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, start.oy + dy)),
        })
      }
    },
    [setOffset]
  )

  const handlePointerUp = useCallback(() => {
    // If no actual drag happened, remove the undo snapshot we saved on pointerDown
    if (!isDraggingRef.current && undoStackRef.current.length > 0) {
      const snap = undoStackRef.current[undoStackRef.current.length - 1]
      const cur = offsetRef.current
      if (snap.offset.x === cur.x && snap.offset.y === cur.y) {
        undoStackRef.current.pop()
        setUndoCount(undoStackRef.current.length)
      }
    }
    startRef.current = null
    isDraggingRef.current = false
    isHoldConfirmedRef.current = false
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    setIsDragging(false)
    setIsHolding(false)
  }, [])

  // Corner handle pointer handlers (using refs to avoid callback churn during drag)
  const handleCornerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, index: number) => {
      e.stopPropagation()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      pushUndo()
      const cur = cornerOffsetsRef.current
      cornerStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        cx: cur[index].x,
        cy: cur[index].y,
      }
      draggingCornerRef.current = index
      setDraggingCorner(index)
    },
    [pushUndo]
  )

  const handleCornerPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const idx = draggingCornerRef.current
      if (idx === null || !cornerStartRef.current) return
      e.stopPropagation()
      const dx = e.clientX - cornerStartRef.current.x
      const dy = e.clientY - cornerStartRef.current.y
      const newOffsets = [...cornerOffsetsRef.current] as unknown as CornerOffsets
      newOffsets[idx] = {
        x: Math.max(
          -MAX_CORNER_OFFSET,
          Math.min(MAX_CORNER_OFFSET, cornerStartRef.current.cx + dx)
        ),
        y: Math.max(
          -MAX_CORNER_OFFSET,
          Math.min(MAX_CORNER_OFFSET, cornerStartRef.current.cy + dy)
        ),
      }
      setCornerOffsets(newOffsets)
    },
    [setCornerOffsets]
  )

  const handleCornerPointerUp = useCallback(() => {
    cornerStartRef.current = null
    draggingCornerRef.current = null
    setDraggingCorner(null)
  }, [])

  const handleUndo = useCallback(() => {
    const snap = undoStackRef.current.pop()
    if (!snap) return
    setOffset(snap.offset)
    setCornerOffsets(snap.corners)
    setUndoCount(undoStackRef.current.length)
  }, [setOffset, setCornerOffsets])

  const hasCornerWarp = cornerOffsets.some((c) => c.x !== 0 || c.y !== 0)

  // Left opacity
  const leftOpacity = isDragging || draggingCorner !== null ? 0.5 : isHolding ? 0 : 1

  const leftColor = '#6B7F3E'
  const rightColor = '#B05228'
  const showingRight = isHolding && !isDragging
  const activeColor = showingRight ? rightColor : leftColor

  const imgConstraint: React.CSSProperties = {
    width: '100%',
    height: '100%',
    maxHeight: 'calc(100dvh - var(--panel-margin))',
    objectFit: 'contain' as const,
  }

  // Compute matrix3d transform for left image
  const leftTransform =
    imgRect && hasCornerWarp
      ? `translate(${offset.x}px, ${offset.y}px) ${computeMatrix3d(imgRect.w, imgRect.h, cornerOffsets)}`
      : `translate(${offset.x}px, ${offset.y}px)`

  // Corner handle positions (relative to panel)
  const cornerPositions = imgRect
    ? [
        { x: imgRect.left, y: imgRect.top },
        { x: imgRect.left + imgRect.w, y: imgRect.top },
        { x: imgRect.left + imgRect.w, y: imgRect.top + imgRect.h },
        { x: imgRect.left, y: imgRect.top + imgRect.h },
      ]
    : null

  return (
    <div className="animate-fade-in space-y-3">
      {/* Instruction strip with side indicator */}
      <div
        className="flex items-center justify-between rounded-xl px-4 py-2"
        style={{
          background: `linear-gradient(90deg, ${activeColor}18, ${activeColor}08)`,
          border: `1px solid ${activeColor}50`,
          transition: 'all 0.2s ease',
        }}
      >
        <span
          className="shrink-0 whitespace-nowrap rounded-full px-3 py-0.5 text-xs font-bold text-white"
          style={{ background: activeColor }}
        >
          {showingRight ? t('right') : t('left')}
        </span>
        <p
          className="whitespace-pre-line text-right text-xs font-medium leading-snug"
          style={{ color: activeColor, minHeight: '2.75em' }}
        >
          {isDragging
            ? t('dragging')
            : draggingCorner !== null
              ? t('warpAdjusting')
              : showingRight
                ? t('releaseToReturn')
                : t('holdInstruction')}
        </p>
      </div>

      {/* Back to adjust + Undo — above the image panel */}
      <div
        className="flex items-center justify-between px-2"
        style={{
          visibility: !isDragging && !isHolding && draggingCorner === null ? 'visible' : 'hidden',
        }}
      >
        {onBackToAdjust ? (
          <button
            onClick={onBackToAdjust}
            className="flex-shrink-0 rounded-lg px-3 py-2 text-xs"
            style={{ color: 'var(--muted)', border: '1px solid var(--border-light)' }}
          >
            {t('backToAdjust')}
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={handleUndo}
          disabled={undoCount === 0}
          className="flex flex-shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-xs"
          style={{
            color: 'var(--muted)',
            border: '1px solid var(--border-light)',
            opacity: undoCount === 0 ? 0.35 : 1,
          }}
        >
          <UndoIcon size={12} />
          {t('undo')}
        </button>
      </div>

      {/* Image panel — right always behind, left overlaid on top */}
      <div
        ref={panelRef}
        className="relative flex touch-none select-none items-center justify-center overflow-hidden"
        style={{
          borderRadius: 14,
          border: `2px solid ${activeColor}40`,
          boxShadow: `0 4px 16px rgba(60,36,21,0.12)`,
          background: 'var(--parchment)',
          transition: 'border-color 0.2s ease',
          minHeight: 'min(280px, calc(100dvh - var(--panel-margin)))',
          maxHeight: 'calc(100dvh - var(--panel-margin))',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={useCallback((e: React.MouseEvent) => e.preventDefault(), [])}
        onPointerLeave={useCallback(() => {
          if (!isDraggingRef.current) handlePointerUp()
          handleCornerPointerUp()
        }, [handlePointerUp, handleCornerPointerUp])}
      >
        {/* Right image — always present, behind left */}
        <img
          src={rightImage}
          alt={t('right')}
          draggable={false}
          style={imgConstraint}
          onLoad={measureImg}
        />

        {/* Left image — overlaid on top with optional perspective warp */}
        <img
          src={leftImage}
          alt={t('left')}
          draggable={false}
          style={{
            ...imgConstraint,
            position: 'absolute',
            opacity: leftOpacity,
            transformOrigin: imgRect ? `${imgRect.left}px ${imgRect.top}px` : '0 0',
            transform: leftTransform,
            transition: 'opacity 0.15s ease',
          }}
        />
      </div>

      {/* Corner warp handles — outside overflow:hidden panel so they stay visible */}
      {cornerPositions && !isHolding && (
        <div className="relative" style={{ height: 0 }}>
          {cornerPositions.map((pos, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: pos.x + cornerOffsets[i].x + offset.x - CORNER_HIT_RADIUS,
                top:
                  pos.y +
                  cornerOffsets[i].y +
                  offset.y -
                  CORNER_HIT_RADIUS -
                  (panelRef.current?.clientHeight ?? 0),
                width: CORNER_HIT_RADIUS * 2,
                height: CORNER_HIT_RADIUS * 2,
                cursor: 'move',
                touchAction: 'none',
                zIndex: draggingCorner === i ? 20 : 10,
              }}
              onPointerDown={(e) => handleCornerPointerDown(e, i)}
              onPointerMove={handleCornerPointerMove}
              onPointerUp={handleCornerPointerUp}
            >
              {/* Glow ring when active */}
              {draggingCorner === i && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: '2.5px solid rgba(245, 197, 24, 0.4)',
                  }}
                />
              )}
              {/* Handle dot — golden with white border (matches corner adjustment) */}
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: draggingCorner === i ? 20 : 16,
                  height: draggingCorner === i ? 20 : 16,
                  borderRadius: '50%',
                  background: draggingCorner === i ? '#D4A010' : '#F5C518',
                  border: '2.5px solid #ffffff',
                  boxShadow: '0 2px 6px rgba(60,36,21,0.25)',
                  transition: 'width 0.1s, height 0.1s',
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
