'use client'

import { useState, useRef, useCallback } from 'react'
import { useI18n } from '@/lib/i18n'

/** Minimum pointer movement (px) to distinguish drag from hold */
const DRAG_THRESHOLD = 25
/** Maximum offset in each direction (px) */
const MAX_OFFSET = 40
/** Time (ms) to confirm hold — once confirmed, drag is disabled */
const HOLD_CONFIRM_MS = 200

interface ImageComparisonProps {
  leftImage: string
  rightImage: string
  initialOffset?: { x: number; y: number }
  onOffsetChange?: (offset: { x: number; y: number }) => void
  onBackToAdjust?: () => void
}

export default function ImageComparison({
  leftImage,
  rightImage,
  initialOffset,
  onOffsetChange,
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

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const cur = offsetRef.current
    startRef.current = { x: e.clientX, y: e.clientY, ox: cur.x, oy: cur.y }
    isDraggingRef.current = false
    isHoldConfirmedRef.current = false
    setIsDragging(false)
    setIsHolding(true)

    // After HOLD_CONFIRM_MS without drag, lock into hold mode
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

      // Once hold is confirmed, ignore all movement
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

  const hasOffset = offset.x !== 0 || offset.y !== 0

  // Left opacity: normal=1, tap-hold=0 (right shows through), drag=0.5 (both visible)
  const leftOpacity = isDragging ? 0.5 : isHolding ? 0 : 1

  // Keep in sync with --left-color / --right-color in globals.css
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
          {isDragging ? t('dragging') : showingRight ? t('releaseToReturn') : t('holdInstruction')}
        </p>
      </div>

      {/* Back to corner adjustment button */}
      {onBackToAdjust && (
        <div
          className="flex justify-end px-2"
          style={{ visibility: !isDragging && !isHolding ? 'visible' : 'hidden' }}
        >
          <button
            onClick={onBackToAdjust}
            className="rounded-lg px-3 py-2 text-xs"
            style={{ color: 'var(--muted)', border: '1px solid var(--border-light)' }}
          >
            {t('backToAdjust')}
          </button>
        </div>
      )}

      {/* Image panel — right always behind, left overlaid on top */}
      <div
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
          // Don't release during drag — setPointerCapture should prevent this,
          // but some browsers fire pointerleave despite capture
          if (!isDraggingRef.current) handlePointerUp()
        }, [handlePointerUp])}
      >
        {/* Right image — always present, behind left */}
        <img src={rightImage} alt={t('right')} draggable={false} style={imgConstraint} />

        {/* Left image — overlaid on top, opacity changes with interaction */}
        <img
          src={leftImage}
          alt={t('left')}
          draggable={false}
          style={{
            ...imgConstraint,
            position: 'absolute',
            opacity: leftOpacity,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            transition: 'opacity 0.15s ease',
          }}
        />
      </div>
    </div>
  )
}
