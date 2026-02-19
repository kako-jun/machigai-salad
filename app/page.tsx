'use client'

import ImageProcessor from '@/components/ImageProcessor'

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-5">
        <header className="mb-5 flex items-center gap-2.5">
          <ShrimpIcon />
          <div>
            <h1 className="text-base font-bold leading-tight text-foreground">
              小エビの間違いサラダ
            </h1>
            <p className="text-xs text-muted">間違いさがし おたすけツール</p>
          </div>
        </header>

        <ImageProcessor />
      </div>
    </main>
  )
}

function ShrimpIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="7" fill="var(--accent-light)" />
      <path
        d="M19.5 10.5c-1-2.5-4-3.5-6.5-2.5s-3.5 3.5-2.5 6c.3.8.8 1.4 1.3 1.9L9 18.5c-.3.3-.1.8.3.8h3.5c2.5 0 4.8-1.2 6-3.2.8-1.2 1.2-2.8.9-4.3-.1-.5-.3-1-.7-1.3z"
        fill="var(--accent)"
        opacity="0.85"
      />
      <circle cx="15" cy="11.5" r="1" fill="white" />
    </svg>
  )
}
