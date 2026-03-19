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
        <p className="text-sm font-medium" style={{ color: activeColor }}>
          {showLeft ? 'タップしてみよう' : 'はなすと もどるよ'}
        </p>
      </div>

      {/* Image panel */}
      <div
        className="relative cursor-pointer touch-none select-none overflow-hidden"
        style={{
          borderRadius: 14,
          border: `2px solid ${activeColor}40`,
          boxShadow: `0 4px 16px rgba(60,36,21,0.12)`,
          background: 'var(--parchment)',
          transition: 'border-color 0.2s ease',
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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
      </div>
    </div>
  )
}
