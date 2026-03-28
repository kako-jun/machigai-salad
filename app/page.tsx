'use client'

import { useI18n } from '@/lib/i18n'
import ImageProcessor from '@/components/ImageProcessor'
import LangToggle from '@/components/LangToggle'

export default function Home() {
  const { t } = useI18n()

  return (
    <main className="relative z-10 min-h-screen">
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Menu-style header card */}
        <header className="menu-card mb-6 px-5 py-4">
          {/* Lang toggle — above the stripe, right-aligned */}
          <div className="mb-1 flex justify-end">
            <LangToggle />
          </div>

          {/* Decorative top stripe */}
          <div className="menu-stripe mb-3" />

          {/* Renaissance-style banner */}
          <div className="mb-3 overflow-hidden rounded">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/static/banner.webp"
              alt={t('bannerAlt')}
              className="w-full"
              style={{ display: 'block' }}
            />
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <h1
              className="text-xl font-extrabold tracking-wide"
              style={{
                color: 'var(--espresso-light)',
                textShadow: '0 1px 0 rgba(255,255,255,0.5)',
                letterSpacing: '0.08em',
              }}
            >
              {t('appTitle')}
            </h1>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {t('appSubtitle')}
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
              href="https://amzn.to/4uWSrNa"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full flex-col items-center gap-1 rounded-xl px-5 py-3 text-center"
              style={{
                color: 'var(--espresso-light)',
                background: 'linear-gradient(145deg, var(--cream), var(--parchment))',
                border: '1.5px solid rgba(212,160,16,0.4)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.5) inset, 0 2px 4px rgba(60,36,21,0.1)',
              }}
            >
              <span className="text-sm font-medium">{t('amazonSupport')}</span>
              <span className="whitespace-pre-line text-xs" style={{ color: 'var(--muted)' }}>
                {t('amazonHint')}
              </span>
            </a>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/static/qr.webp"
                alt="QR code"
                width={120}
                height={120}
                className="rounded"
              />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                {t('shareApp')}
              </span>
            </div>

            <div
              className="flex flex-wrap items-center justify-center gap-3 text-xs"
              style={{ color: 'var(--muted)' }}
            >
              <a
                href="https://llll-ll.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {t('authorSite')}
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
