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
  const [showLeft, setShowLeft] = useState(true)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const startRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      startRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
      isDraggingRef.current = false
      setShowLeft(false) // show right immediately (tap behavior)
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
      setShowLeft(true) // switch back to left for drag adjustment
    }

    if (isDraggingRef.current) {
      setOffset({
        x: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, start.ox + dx)),
        y: Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, start.oy + dy)),
      })
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    if (!isDraggingRef.current) {
      setShowLeft(true) // was a tap — back to left
    }
    startRef.current = null
    isDraggingRef.current = false
  }, [])

  const hasOffset = offset.x !== 0 || offset.y !== 0

  const leftColor = '#6B7F3E'
  const rightColor = '#B05228'
  const activeColor = showLeft ? leftColor : rightColor

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
          {showLeft ? 'ひだり' : 'みぎ'}
        </span>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium" style={{ color: activeColor }}>
            {showLeft ? 'タップでみぎ / ドラッグでずらす' : 'はなすと もどるよ'}
          </p>
          {hasOffset && (
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

      {/* Image panel — fits within viewport (both width and height constrained) */}
      <div
        className="relative flex touch-none select-none items-center justify-center overflow-hidden"
        style={{
          borderRadius: 14,
          border: `2px solid ${activeColor}40`,
          boxShadow: `0 4px 16px rgba(60,36,21,0.12)`,
          background: 'var(--parchment)',
          transition: 'border-color 0.2s ease',
          maxHeight: 'calc(100dvh - 280px)',
          cursor: showLeft ? 'grab' : 'default',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img
          src={leftImage}
          alt="ひだりの絵"
          draggable={false}
          style={{
            display: showLeft ? 'block' : 'none',
            maxWidth: '100%',
            maxHeight: 'calc(100dvh - 280px)',
            objectFit: 'contain',
            transform: `translate(${offset.x}px, ${offset.y}px)`,
          }}
        />

        <img
          src={rightImage}
          alt="みぎの絵"
          draggable={false}
          style={{
            display: showLeft ? 'none' : 'block',
            maxWidth: '100%',
            maxHeight: 'calc(100dvh - 280px)',
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  )
}
