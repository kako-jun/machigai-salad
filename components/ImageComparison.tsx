'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { Point, CornerOffsets } from '@/types'
import { MAX_UNDO } from '@/types'
import { useI18n } from '@/lib/i18n'
import { UndoIcon } from './icons'
import { drawMeshWarp } from '@/lib/mesh-warp'

/** Minimum pointer movement (px) to distinguish drag from hold */
const DRAG_THRESHOLD = 25
/** Maximum offset in each direction (px) */
const MAX_OFFSET = 40
/** Maximum corner warp offset (px) */
const MAX_CORNER_OFFSET = 30
/** Maximum center warp offset (px) */
const MAX_CENTER_OFFSET = 30
/** Time (ms) to confirm hold — once confirmed, drag is disabled */
const HOLD_CONFIRM_MS = 200
/** Corner/center handle hit area radius (px) */
const HANDLE_HIT_RADIUS = 22

const ZERO_CORNERS: CornerOffsets = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
]

interface ImageComparisonProps {
  leftImage: string
  rightImage: string
  initialOffset?: { x: number; y: number }
  onOffsetChange?: (offset: { x: number; y: number }) => void
  initialWarpCorners?: CornerOffsets
  onWarpChange?: (corners: CornerOffsets) => void
  initialCenterOffset?: Point
  onCenterChange?: (center: Point) => void
  onDisplaySize?: (size: { w: number; h: number; left: number; top: number }) => void
  onBackToAdjust?: () => void
}

interface UndoSnapshot {
  offset: { x: number; y: number }
  corners: CornerOffsets
  center: Point
}

/** Compute objectFit:contain image rect within a container (pure math) */
function computeImgRect(
  containerW: number,
  containerH: number,
  naturalW: number,
  naturalH: number
): { w: number; h: number; left: number; top: number } {
  const imageAspect = naturalW / naturalH
  const containerAspect = containerW / containerH

  if (imageAspect > containerAspect) {
    const w = containerW
    const h = containerW / imageAspect
    return { w, h, left: 0, top: (containerH - h) / 2 }
  } else {
    const h = containerH
    const w = containerH * imageAspect
    return { w, h, left: (containerW - w) / 2, top: 0 }
  }
}

export default function ImageComparison({
  leftImage,
  rightImage,
  initialOffset,
  onOffsetChange,
  initialWarpCorners,
  onWarpChange,
  initialCenterOffset,
  onCenterChange,
  onDisplaySize,
  onBackToAdjust,
}: ImageComparisonProps) {
  const { t } = useI18n()

  // --- Offset (slide) state ---
  const [offset, _setOffset] = useState(initialOffset ?? { x: 0, y: 0 })
  const onOffsetChangeRef = useRef(onOffsetChange)
  onOffsetChangeRef.current = onOffsetChange
  const onDisplaySizeRef = useRef(onDisplaySize)
  onDisplaySizeRef.current = onDisplaySize
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

  // --- Corner warp state ---
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
  const cornerPosHistoryRef = useRef<Array<{ x: number; y: number; t: number }>>([])

  // --- Center warp state ---
  const [centerOffset, _setCenterOffset] = useState<Point>(initialCenterOffset ?? { x: 0, y: 0 })
  const onCenterChangeRef = useRef(onCenterChange)
  onCenterChangeRef.current = onCenterChange
  const setCenterOffset = useCallback((c: Point) => {
    _setCenterOffset(c)
    onCenterChangeRef.current?.(c)
  }, [])
  const [draggingCenter, setDraggingCenter] = useState(false)
  const draggingCenterRef = useRef(false)
  const centerOffsetRef = useRef(centerOffset)
  centerOffsetRef.current = centerOffset
  const centerStartRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)
  const centerPosHistoryRef = useRef<Array<{ x: number; y: number; t: number }>>([])

  // --- Undo ---
  const undoStackRef = useRef<UndoSnapshot[]>([])
  const [undoCount, setUndoCount] = useState(0)
  const pushUndo = useCallback(() => {
    const stack = undoStackRef.current
    stack.push({
      offset: { ...offsetRef.current },
      corners: cornerOffsetsRef.current.map((c) => ({ ...c })) as unknown as CornerOffsets,
      center: { ...centerOffsetRef.current },
    })
    if (stack.length > MAX_UNDO) stack.splice(0, stack.length - MAX_UNDO)
    setUndoCount(stack.length)
  }, [])

  // --- Panel & canvas ---
  const panelRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imgRect, setImgRect] = useState<{
    w: number
    h: number
    left: number
    top: number
    panelLeft: number
    panelHeight: number
  } | null>(null)

  // --- Load both images as Image objects (no DOM <img>) ---
  const leftImgRef = useRef<HTMLImageElement | null>(null)
  const rightImgRef = useRef<HTMLImageElement | null>(null)
  const [imgsReady, setImgsReady] = useState(false)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    setImgsReady(false)
    let loadedCount = 0
    const onLoaded = () => {
      if (++loadedCount === 2) setImgsReady(true)
    }

    const lImg = new Image()
    lImg.onload = () => {
      leftImgRef.current = lImg
      onLoaded()
    }
    lImg.onerror = () => console.error('ImageComparison: failed to load left image')
    lImg.src = leftImage

    const rImg = new Image()
    rImg.onload = () => {
      rightImgRef.current = rImg
      setNaturalSize({ w: rImg.naturalWidth, h: rImg.naturalHeight })
      onLoaded()
    }
    rImg.onerror = () => console.error('ImageComparison: failed to load right image')
    rImg.src = rightImage
  }, [leftImage, rightImage])

  // --- Compute imgRect from panel dimensions (pure math, no DOM img measurement) ---
  const recomputeRect = useCallback(() => {
    const panel = panelRef.current
    if (!panel || !naturalSize) return
    const pw = panel.clientWidth
    const ph = panel.clientHeight
    if (!pw || !ph) return
    const rect = computeImgRect(pw, ph, naturalSize.w, naturalSize.h)
    setImgRect({ ...rect, panelLeft: panel.offsetLeft, panelHeight: ph })
    onDisplaySizeRef.current?.(rect)
  }, [naturalSize])

  useEffect(() => {
    recomputeRect()
    window.addEventListener('resize', recomputeRect)
    return () => window.removeEventListener('resize', recomputeRect)
  }, [recomputeRect])

  // --- Canvas draw effect: both images rendered on canvas ---
  useEffect(() => {
    const canvas = canvasRef.current
    const panel = panelRef.current
    const leftImg = leftImgRef.current
    const rightImg = rightImgRef.current
    if (!canvas || !panel || !leftImg || !rightImg || !imgRect || !imgsReady) return

    const dpr = window.devicePixelRatio || 1
    const pw = panel.clientWidth
    const ph = panel.clientHeight

    if (canvas.width !== pw * dpr || canvas.height !== ph * dpr) {
      canvas.width = pw * dpr
      canvas.height = ph * dpr
      canvas.style.width = `${pw}px`
      canvas.style.height = `${ph}px`
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, pw, ph)

    // 1. Always draw right image as background
    ctx.drawImage(rightImg, imgRect.left, imgRect.top, imgRect.w, imgRect.h)

    // 2. Draw mesh-warped left image with appropriate opacity
    const isAnyHandleDragging = draggingCorner !== null || draggingCenter
    const leftOpacity = isDragging || isAnyHandleDragging ? 0.5 : isHolding ? 0 : 1

    if (leftOpacity > 0) {
      ctx.globalAlpha = leftOpacity
      drawMeshWarp(ctx, leftImg, imgRect.w, imgRect.h, {
        cornerOffsets,
        centerOffset,
        offset,
        imgLeft: imgRect.left,
        imgTop: imgRect.top,
      })
      ctx.globalAlpha = 1
    }

    ctx.restore()
  }, [
    offset,
    cornerOffsets,
    centerOffset,
    imgRect,
    imgsReady,
    isDragging,
    isHolding,
    draggingCorner,
    draggingCenter,
  ])

  // --- Panel pointer handlers (hold/drag for slide) ---
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
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
    },
    [pushUndo]
  )

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

  // --- Corner handle handlers ---
  const handleCornerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, index: number) => {
      e.stopPropagation()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      pushUndo()
      const cur = cornerOffsetsRef.current
      cornerStartRef.current = { x: e.clientX, y: e.clientY, cx: cur[index].x, cy: cur[index].y }
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
      const newX = Math.max(
        -MAX_CORNER_OFFSET,
        Math.min(MAX_CORNER_OFFSET, cornerStartRef.current.cx + dx)
      )
      const newY = Math.max(
        -MAX_CORNER_OFFSET,
        Math.min(MAX_CORNER_OFFSET, cornerStartRef.current.cy + dy)
      )

      const hist = cornerPosHistoryRef.current
      hist.push({ x: newX, y: newY, t: performance.now() })
      if (hist.length > 20) hist.shift()

      const newOffsets = [...cornerOffsetsRef.current] as unknown as CornerOffsets
      newOffsets[idx] = { x: newX, y: newY }
      setCornerOffsets(newOffsets)
    },
    [setCornerOffsets]
  )

  const handleCornerPointerUp = useCallback(() => {
    const idx = draggingCornerRef.current
    if (idx !== null) {
      const hist = cornerPosHistoryRef.current
      if (hist.length >= 2) {
        const now = performance.now()
        const LOOKBACK_MS = 200
        for (let i = hist.length - 1; i >= 0; i--) {
          if (now - hist[i].t >= LOOKBACK_MS) {
            const newOffsets = [...cornerOffsetsRef.current] as unknown as CornerOffsets
            newOffsets[idx] = { x: hist[i].x, y: hist[i].y }
            setCornerOffsets(newOffsets)
            break
          }
        }
      }
    }
    cornerPosHistoryRef.current = []
    cornerStartRef.current = null
    draggingCornerRef.current = null
    setDraggingCorner(null)
  }, [setCornerOffsets])

  // --- Center handle handlers ---
  const handleCenterPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      pushUndo()
      const cur = centerOffsetRef.current
      centerStartRef.current = { x: e.clientX, y: e.clientY, cx: cur.x, cy: cur.y }
      draggingCenterRef.current = true
      setDraggingCenter(true)
    },
    [pushUndo]
  )

  const handleCenterPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingCenterRef.current || !centerStartRef.current) return
      e.stopPropagation()
      const dx = e.clientX - centerStartRef.current.x
      const dy = e.clientY - centerStartRef.current.y
      const newX = Math.max(
        -MAX_CENTER_OFFSET,
        Math.min(MAX_CENTER_OFFSET, centerStartRef.current.cx + dx)
      )
      const newY = Math.max(
        -MAX_CENTER_OFFSET,
        Math.min(MAX_CENTER_OFFSET, centerStartRef.current.cy + dy)
      )

      const hist = centerPosHistoryRef.current
      hist.push({ x: newX, y: newY, t: performance.now() })
      if (hist.length > 20) hist.shift()

      setCenterOffset({ x: newX, y: newY })
    },
    [setCenterOffset]
  )

  const handleCenterPointerUp = useCallback(() => {
    if (draggingCenterRef.current) {
      const hist = centerPosHistoryRef.current
      if (hist.length >= 2) {
        const now = performance.now()
        const LOOKBACK_MS = 200
        for (let i = hist.length - 1; i >= 0; i--) {
          if (now - hist[i].t >= LOOKBACK_MS) {
            setCenterOffset({ x: hist[i].x, y: hist[i].y })
            break
          }
        }
      }
    }
    centerPosHistoryRef.current = []
    centerStartRef.current = null
    draggingCenterRef.current = false
    setDraggingCenter(false)
  }, [setCenterOffset])

  // --- Common handlers ---
  const handleContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), [])

  const handlePointerLeave = useCallback(() => {
    if (!isDraggingRef.current) handlePointerUp()
    handleCornerPointerUp()
    handleCenterPointerUp()
  }, [handlePointerUp, handleCornerPointerUp, handleCenterPointerUp])

  const handleUndo = useCallback(() => {
    const snap = undoStackRef.current.pop()
    if (!snap) return
    setOffset(snap.offset)
    setCornerOffsets(snap.corners)
    setCenterOffset(snap.center)
    setUndoCount(undoStackRef.current.length)
  }, [setOffset, setCornerOffsets, setCenterOffset])

  // --- Derived state ---
  const isAnyHandleDragging = draggingCorner !== null || draggingCenter
  const showingRight = isHolding && !isDragging
  const leftColor = '#6B7F3E'
  const rightColor = '#B05228'
  const activeColor = showingRight ? rightColor : leftColor

  // Handle positions (relative to panel, computed from imgRect)
  const cornerPositions = imgRect
    ? [
        { x: imgRect.left, y: imgRect.top },
        { x: imgRect.left + imgRect.w, y: imgRect.top },
        { x: imgRect.left + imgRect.w, y: imgRect.top + imgRect.h },
        { x: imgRect.left, y: imgRect.top + imgRect.h },
      ]
    : null

  const centerPosition = imgRect
    ? { x: imgRect.left + imgRect.w / 2, y: imgRect.top + imgRect.h / 2 }
    : null

  // Panel may be narrower than its shared parent (mx-auto centering for portrait images).
  // Handles live in a sibling wrapper whose origin is the parent's left edge, so shift
  // them by the panel's left offset to stay aligned with the image content.
  const panelLeft = imgRect?.panelLeft ?? 0
  const panelHeight = imgRect?.panelHeight ?? 0

  // Panel aspect ratio for sizing (replaces the DOM img element's sizing role)
  const panelAspectRatio = naturalSize ? `${naturalSize.w} / ${naturalSize.h}` : undefined

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
            : isAnyHandleDragging
              ? t('warpAdjusting')
              : showingRight
                ? t('releaseToReturn')
                : t('holdInstruction')}
        </p>
      </div>

      {/* Back to adjust + Undo */}
      <div
        className="flex items-center justify-between px-2"
        style={{
          visibility: !isDragging && !isHolding && !isAnyHandleDragging ? 'visible' : 'hidden',
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

      {/* Image panel — canvas renders both images, no DOM <img> */}
      <div
        ref={panelRef}
        className="relative mx-auto flex touch-none select-none items-center justify-center overflow-hidden"
        style={{
          borderRadius: 14,
          border: `2px solid ${activeColor}40`,
          boxShadow: `0 4px 16px rgba(60,36,21,0.12)`,
          background: 'var(--parchment)',
          transition: 'border-color 0.2s ease',
          minHeight: 'min(280px, calc(100dvh - var(--panel-margin)))',
          maxHeight: 'calc(100dvh - var(--panel-margin))',
          maxWidth: naturalSize
            ? `calc((100dvh - var(--panel-margin)) * ${naturalSize.w} / ${naturalSize.h})`
            : undefined,
          aspectRatio: panelAspectRatio,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
        onPointerLeave={handlePointerLeave}
      >
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>

      {/* Warp handles — DOM elements outside overflow:hidden panel for unrestricted positioning */}
      {!isHolding && (
        <div className="relative" style={{ height: 0 }}>
          {/* Corner handles */}
          {cornerPositions?.map((pos, i) => (
            <div
              key={`corner-${i}`}
              className="absolute"
              style={{
                left: panelLeft + pos.x + cornerOffsets[i].x + offset.x - HANDLE_HIT_RADIUS,
                top: pos.y + cornerOffsets[i].y + offset.y - HANDLE_HIT_RADIUS - panelHeight,
                width: HANDLE_HIT_RADIUS * 2,
                height: HANDLE_HIT_RADIUS * 2,
                cursor: 'move',
                touchAction: 'none',
                zIndex: draggingCorner === i ? 20 : 10,
              }}
              onPointerDown={(e) => handleCornerPointerDown(e, i)}
              onPointerMove={handleCornerPointerMove}
              onPointerUp={handleCornerPointerUp}
            >
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

          {/* Center handle */}
          {centerPosition && (
            <div
              className="absolute"
              style={{
                left: panelLeft + centerPosition.x + centerOffset.x + offset.x - HANDLE_HIT_RADIUS,
                top: centerPosition.y + centerOffset.y + offset.y - HANDLE_HIT_RADIUS - panelHeight,
                width: HANDLE_HIT_RADIUS * 2,
                height: HANDLE_HIT_RADIUS * 2,
                cursor: 'move',
                touchAction: 'none',
                zIndex: draggingCenter ? 20 : 10,
              }}
              onPointerDown={handleCenterPointerDown}
              onPointerMove={handleCenterPointerMove}
              onPointerUp={handleCenterPointerUp}
            >
              {draggingCenter && (
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
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: draggingCenter ? 20 : 16,
                  height: draggingCenter ? 20 : 16,
                  borderRadius: '50%',
                  background: draggingCenter ? '#D4A010' : '#F5C518',
                  border: '2.5px solid #ffffff',
                  boxShadow: '0 2px 6px rgba(60,36,21,0.25)',
                  transition: 'width 0.1s, height 0.1s',
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
