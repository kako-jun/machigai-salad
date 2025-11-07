'use client'

import { useState } from 'react'
import ImageProcessor from '@/components/ImageProcessor'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-orange-600">🦐 小エビの間違いサラダ</h1>
          <p className="text-gray-600">Shrimp Salad of Differences</p>
          <p className="mt-2 text-sm text-gray-500">間違い探しの画像を撮影して、比較を簡単に！</p>
        </header>

        <ImageProcessor />
      </div>
    </main>
  )
}
