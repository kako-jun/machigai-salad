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
    <div className="rounded-lg bg-white p-4 shadow-lg">
      <div className="mb-4 text-center">
        <h3 className="mb-2 text-xl font-bold text-gray-800">画像を比較</h3>
        <p className="text-sm text-gray-600">
          {showLeft ? '👆 タップして右の画像を表示' : '👆 離して左の画像を表示'}
        </p>
      </div>

      <div
        className="relative cursor-pointer touch-none select-none overflow-hidden rounded-lg"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ aspectRatio: 'auto' }}
      >
        {/* Left image */}
        <img
          src={leftImage}
          alt="Left comparison"
          className={`h-auto w-full transition-opacity duration-200 ${
            showLeft ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ display: showLeft ? 'block' : 'none' }}
        />

        {/* Right image */}
        <img
          src={rightImage}
          alt="Right comparison"
          className={`h-auto w-full transition-opacity duration-200 ${
            showLeft ? 'opacity-0' : 'opacity-100'
          } absolute left-0 top-0`}
          style={{ display: showLeft ? 'none' : 'block' }}
        />

        {/* Indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 transform rounded-full bg-black bg-opacity-50 px-4 py-2 text-sm text-white">
          {showLeft ? '左の画像' : '右の画像'}
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="h-3 w-3 rounded-full bg-blue-500"></div>
          <span>左</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
          <span>右</span>
        </div>
      </div>
    </div>
  )
}
