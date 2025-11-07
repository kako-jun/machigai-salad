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
    <div className="rounded-lg bg-white p-8 shadow-lg">
      <div className="mb-6 text-center">
        <div className="mb-4 text-6xl">📸</div>
        <h2 className="mb-2 text-2xl font-bold text-gray-800">間違い探しの画像を撮影</h2>
        <p className="mb-4 text-gray-600">サイゼリヤの間違い探しを撮影してください</p>
        {!cvLoaded && (
          <p className="mb-4 text-sm text-orange-500">画像処理エンジンを読み込み中...</p>
        )}
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
          className="w-full rounded-lg bg-orange-500 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {cvLoaded ? '📷 写真を撮る / 選択する' : '読み込み中...'}
        </button>
      </div>

      <div className="mt-6 text-sm text-gray-500">
        <p className="mb-2 font-semibold">使い方:</p>
        <ol className="list-inside list-decimal space-y-1">
          <li>間違い探しの写真を撮影または選択</li>
          <li>アプリが自動的に左右に分割</li>
          <li>画面をタップして画像を切り替えて比較</li>
        </ol>
      </div>
    </div>
  )
}
