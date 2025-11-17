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
    <div className="rounded-lg bg-gradient-to-br from-orange-50 to-yellow-50 p-4 shadow-lg">
      <div className="mb-4 text-center">
        <h3 className="mb-2 text-2xl font-bold text-orange-600">🎯 まちがいさがし！</h3>
        <p className="text-base font-semibold text-gray-700">
          {showLeft ? '👆 タッチすると もう1つの絵が見えるよ' : '✨ 指をはなすと もどるよ'}
        </p>
      </div>

      <div
        className="relative cursor-pointer touch-none select-none overflow-hidden rounded-lg border-4 border-orange-300 shadow-md"
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
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 transform rounded-full bg-orange-500 bg-opacity-90 px-5 py-2 text-base font-bold text-white shadow-lg">
          {showLeft ? '📄 1つ目の絵' : '📄 2つ目の絵'}
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-white p-3 text-center">
        <p className="text-sm font-semibold text-gray-700">
          💡 2つの絵をくらべて、ちがうところを さがしてね！
        </p>
      </div>
    </div>
  )
}
