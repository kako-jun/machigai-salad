'use client'

import ImageProcessor from '@/components/ImageProcessor'

export default function Home() {
  return (
    <main className="relative z-10 min-h-screen">
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Menu-style header card */}
        <header className="menu-card mb-6 px-5 py-4">
          {/* Decorative top stripe */}
          <div className="menu-stripe mb-3" />

          <div className="flex items-center gap-3">
            <ShrimpIcon />
            <div className="flex-1">
              <h1 className="text-base font-bold leading-tight text-espresso">
                小エビの間違いサラダ
              </h1>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                間違いさがし おたすけツール
              </p>
            </div>
            {/* Menu number badge */}
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
              style={{
                background: 'linear-gradient(160deg, #F5C518, #D4A010)',
                border: '1px solid #A07830',
                color: '#3C2415',
                boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 2px 4px rgba(60,36,21,0.2)',
              }}
            >
              No.1
            </div>
          </div>

          {/* Decorative bottom stripe */}
          <div className="menu-stripe mt-3" />
        </header>

        <ImageProcessor />
      </div>
    </main>
  )
}

function ShrimpIcon() {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: 'linear-gradient(145deg, #FDEBD8, #F5C095)',
        border: '1px solid #D4885A',
        boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 2px 6px rgba(60,36,21,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M19.5 10.5c-1-2.5-4-3.5-6.5-2.5s-3.5 3.5-2.5 6c.3.8.8 1.4 1.3 1.9L9 18.5c-.3.3-.1.8.3.8h3.5c2.5 0 4.8-1.2 6-3.2.8-1.2 1.2-2.8.9-4.3-.1-.5-.3-1-.7-1.3z"
          fill="#CC6B3C"
          opacity="0.9"
        />
        <circle cx="15" cy="11.5" r="1" fill="white" />
      </svg>
    </div>
  )
}
