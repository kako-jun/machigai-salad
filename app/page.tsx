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

          <div className="flex flex-col items-center gap-1.5">
            <h1
              className="text-xl font-extrabold tracking-wide"
              style={{
                color: '#5C3D1E',
                textShadow: '0 1px 0 rgba(255,255,255,0.5)',
                letterSpacing: '0.08em',
              }}
            >
              小エビの間違いサラダ
            </h1>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              間違いさがし おたすけツール
            </p>
          </div>

          {/* Decorative bottom stripe */}
          <div className="menu-stripe mt-3" />
        </header>

        <ImageProcessor />

        {/* Footer */}
        <footer className="menu-card mt-6 px-5 py-4">
          <div className="flex flex-col items-center gap-4">
            <a
              href="https://amzn.to/41dkZF1"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full flex-col items-center gap-1 rounded-xl px-5 py-3 text-center"
              style={{
                color: '#5C3D1E',
                background: 'linear-gradient(145deg, #FFF8E7, #F5E0B0)',
                border: '1.5px solid rgba(212,160,16,0.4)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.5) inset, 0 2px 4px rgba(60,36,21,0.1)',
              }}
            >
              <span className="text-sm font-medium">Amazon で応援する</span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                リンク先の商品でなくても、ここから買い物するだけで支援になるよ
              </span>
            </a>

            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--muted)' }}>
              <a
                href="https://llll-ll.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                作者のサイト
              </a>
              <span>·</span>
              <a
                href="https://github.com/sponsors/kako-jun"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                GitHub Sponsors
              </a>
              <span>·</span>
              <span>© kako-jun</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  )
}
