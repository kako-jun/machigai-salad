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
    <div className="animate-fade-in flex flex-col items-center py-12">
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
        className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-10 py-8 shadow-sm transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-40"
      >
        {cvLoaded ? (
          <CameraIcon />
        ) : (
          <div className="border-3 animate-spin-smooth h-10 w-10 rounded-full border-accent border-t-transparent" />
        )}

        <span className="text-base font-bold text-foreground">
          {cvLoaded ? 'しゃしんを とる' : 'じゅんびちゅう...'}
        </span>
      </button>

      <p className="mt-6 text-center text-sm leading-relaxed text-muted">
        間違いさがしの紙を
        <br />
        まっすぐ撮ってね
      </p>
    </div>
  )
}

function CameraIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}
