'use client'

import { useRef } from 'react'

interface ImageUploadProps {
  onImageUpload: (imageDataUrl: string) => void
  cvLoaded: boolean
}

export default function ImageUpload({ onImageUpload, cvLoaded }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageDataUrl = event.target?.result as string
      onImageUpload(imageDataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="rounded-lg bg-gradient-to-br from-orange-50 to-yellow-50 p-8 shadow-lg">
      <div className="mb-6 text-center">
        <div className="mb-4 text-7xl">🍤</div>
        <h2 className="mb-2 text-3xl font-bold text-orange-600">小エビの間違いサラダ</h2>
        <p className="mb-4 text-lg font-semibold text-gray-700">
          サイゼリヤの間違いさがしの写真をとってね！
        </p>
        {!cvLoaded && <p className="mb-4 text-sm text-orange-500">⏳ ちょっと待ってね...</p>}
      </div>

      <div className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          disabled={!cvLoaded}
        />
        <button
          onClick={handleButtonClick}
          disabled={!cvLoaded}
          className="w-full rounded-lg bg-orange-500 px-8 py-5 text-xl font-bold text-white shadow-md transition-all hover:bg-orange-600 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
        >
          {cvLoaded ? '📷 しゃしんを とる' : 'じゅんび中...'}
        </button>
      </div>

      <div className="mt-6 rounded-lg bg-white p-4">
        <p className="mb-3 text-base font-bold text-orange-600">📖 つかいかた</p>
        <ol className="list-inside list-decimal space-y-2 text-sm text-gray-700">
          <li>間違いさがしの絵を📷写真にとる</li>
          <li>絵がまっすぐじゃなくても だいじょうぶ！</li>
          <li>タッチして 2つの絵をくらべる</li>
          <li>ちがうところを さがそう！🎯</li>
        </ol>
      </div>

      <div className="mt-4 rounded-lg bg-orange-100 p-3 text-center">
        <p className="text-sm font-semibold text-orange-700">
          💡 ヒント: 絵をまっすぐに写すと もっと見やすいよ！
        </p>
      </div>
    </div>
  )
}
