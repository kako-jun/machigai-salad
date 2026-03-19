'use client'

import { useState, useRef, useCallback } from 'react'

/** Minimum pointer movement (px) to distinguish drag from tap */
const DRAG_THRESHOLD = 5
/** Maximum offset in each direction (px) */
const MAX_OFFSET = 40

interface ImageComparisonProps {
  leftImage: string
  rightImage: string
}

export default function ImageComparison({ leftImage, rightImage }: ImageComparisonProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isHolding, setIsHolding] = useState(false)
  const isDraggingRef = useRef(false)
  const startRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      startRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
      isDraggingRef.current = false
      setIsDragging(false)
      setIsHolding(true) // start fading toward 0 immediately
    },
    [offset]
  )

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (!start) return

    const dx = e.clientX - start.x
    const dy = e.clientY - start.y

    if (!isDraggingRef.current && dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
      isDraggingRef.current = true
      setIsDragging(true) // redirect fade to 0.5 instead of 0
    }

    if (isDraggingRef.current) {
      setOffset({
        x: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, start.ox + dx)),
        y: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, start.oy + dy)),
      })
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    startRef.current = null
    isDraggingRef.current = false
    setIsDragging(false)
    setIsHolding(false) // fade back to 1
  }, [])

  const hasOffset = offset.x !== 0 || offset.y !== 0

  // Left opacity: normal=1, tap-hold=0 (right shows through), drag=0.5 (both visible)
  const leftOpacity = isDragging ? 0.5 : isHolding ? 0 : 1

  const leftColor = '#6B7F3E'
  const rightColor = '#B05228'
  const showingRight = isHolding && !isDragging
  const activeColor = showingRight ? rightColor : leftColor

  const imgConstraint: React.CSSProperties = {
    width: '100%',
    height: '100%',
    maxHeight: 'calc(100dvh - 280px)',
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
          className="rounded-full px-3 py-0.5 text-xs font-bold text-white"
          style={{ background: activeColor }}
        >
          {showingRight ? 'みぎ' : 'ひだり'}
        </span>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium" style={{ color: activeColor }}>
            {isDragging
              ? 'ずらしちゅう...'
              : showingRight
                ? 'はなすと もどるよ'
                : 'タップでみぎ / ドラッグでずらす'}
          </p>
          {hasOffset && !isDragging && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setOffset({ x: 0, y: 0 })
              }}
              className="rounded-lg px-2 py-0.5 text-xs"
              style={{ color: 'var(--muted)', border: '1px solid var(--border-light)' }}
            >
              リセット
            </button>
          )}
        </div>
      </div>

      {/* Image panel — right always behind, left overlaid on top */}
      <div
        className="relative flex touch-none select-none items-center justify-center overflow-hidden"
        style={{
          borderRadius: 14,
          border: `2px solid ${activeColor}40`,
          boxShadow: `0 4px 16px rgba(60,36,21,0.12)`,
          background: 'var(--parchment)',
          transition: 'border-color 0.2s ease',
          minHeight: 280,
          maxHeight: 'calc(100dvh - 280px)',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Right image — always present, behind left */}
        <img src={rightImage} alt="みぎの絵" draggable={false} style={imgConstraint} />

        {/* Left image — overlaid on top, opacity changes with interaction */}
        <img
          src={leftImage}
          alt="ひだりの絵"
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
