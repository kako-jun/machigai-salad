'use client'

import { useState } from 'react'

interface ImageComparisonProps {
  leftImage: string
  rightImage: string
}

export default function ImageComparison({ leftImage, rightImage }: ImageComparisonProps) {
  const [showLeft, setShowLeft] = useState(true)

  const handleMouseDown = () => setShowLeft(false)
  const handleMouseUp = () => setShowLeft(true)
  const handleTouchStart = () => setShowLeft(false)
  const handleTouchEnd = () => setShowLeft(true)

  return (
    <div className="animate-fade-in space-y-3">
      {/* Instruction strip styled like menu tip box */}
      <div
        className="flex items-center justify-center gap-2 rounded-xl px-4 py-2"
        style={{
          background: showLeft
            ? 'linear-gradient(90deg, rgba(245,197,24,0.15), rgba(245,197,24,0.08))'
            : 'linear-gradient(90deg, rgba(204,107,60,0.15), rgba(204,107,60,0.08))',
          border: `1px solid ${showLeft ? 'rgba(212,160,16,0.35)' : 'rgba(176,82,40,0.35)'}`,
          transition: 'all 0.2s ease',
        }}
      >
        <span className="text-sm" style={{ fontSize: 16 }}>
          {showLeft ? '👈' : '👉'}
        </span>
        <p
          className="text-sm font-medium"
          style={{ color: showLeft ? 'var(--golden-dark)' : 'var(--accent)' }}
        >
          {showLeft ? 'タップしてみよう' : 'はなすと もどるよ'}
        </p>
      </div>

      {/* Placemat image panel — feels like holding a laminated menu */}
      <div
        className="relative cursor-pointer touch-none select-none overflow-hidden"
        style={{
          borderRadius: 14,
          border: '2px solid var(--border)',
          boxShadow:
            '0 1px 0 rgba(255,255,255,0.7) inset, 0 -1px 0 rgba(180,130,60,0.25) inset, 0 6px 20px rgba(60,36,21,0.15), 0 2px 6px rgba(60,36,21,0.1)',
          background: 'var(--parchment)',
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Corner fold decoration — top-right */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 24,
            height: 24,
            background: 'linear-gradient(225deg, var(--parchment) 50%, transparent 50%)',
            borderBottomLeftRadius: 4,
            zIndex: 10,
            borderLeft: '1px solid var(--border-light)',
            borderBottom: '1px solid var(--border-light)',
            opacity: 0.8,
          }}
        />

        <img
          src={leftImage}
          alt="ひだりの絵"
          className="h-auto w-full"
          style={{ display: showLeft ? 'block' : 'none' }}
        />

        <img
          src={rightImage}
          alt="みぎの絵"
          className="h-auto w-full"
          style={{ display: showLeft ? 'none' : 'block' }}
        />

        {/* Side label badge */}
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-bold text-white transition-all"
          style={{
            background: showLeft
              ? 'linear-gradient(160deg, rgba(60,36,21,0.75), rgba(60,36,21,0.55))'
              : 'linear-gradient(160deg, #E07040, #B05228)',
            boxShadow: showLeft
              ? '0 2px 6px rgba(60,36,21,0.3)'
              : '0 2px 8px rgba(176,82,40,0.4), 0 1px 0 rgba(255,255,255,0.2) inset',
            border: showLeft ? '1px solid rgba(255,255,255,0.15)' : '1px solid #8B3E1A',
            textShadow: '0 -1px 0 rgba(0,0,0,0.3)',
          }}
        >
          {showLeft ? 'ひだり' : 'みぎ'}
        </div>
      </div>
    </div>
  )
}
