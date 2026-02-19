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
      <p className="text-center text-sm text-muted">
        {showLeft ? 'タップしてみよう' : 'はなすと もどるよ'}
      </p>

      <div
        className="relative cursor-pointer touch-none select-none overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ aspectRatio: 'auto' }}
      >
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

        <div
          className={`absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-colors ${
            showLeft ? 'bg-foreground/60' : 'bg-accent'
          }`}
        >
          {showLeft ? 'ひだり' : 'みぎ'}
        </div>
      </div>
    </div>
  )
}
