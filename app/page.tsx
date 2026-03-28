'use client'

import { useI18n } from '@/lib/i18n'
import ImageProcessor from '@/components/ImageProcessor'
import LangToggle from '@/components/LangToggle'
import PwaInstallPrompt from '@/components/PwaInstallPrompt'
import VisitorCounter from '@/components/VisitorCounter'

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
          <div className="menu-stripe mb-3" />
          <div className="flex flex-col items-center gap-4">
            <a
              href="https://amzn.to/4uWSrNa"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost flex w-full flex-col items-center gap-1 px-5 py-3 text-center"
            >
              <span
                className="flex items-center gap-1.5 text-sm font-medium"
                style={{ color: 'var(--espresso-light)' }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5.8 11.3 2 22l10.7-3.8" />
                  <path d="M4 3h.01" />
                  <path d="M22 8h.01" />
                  <path d="M15 2h.01" />
                  <path d="M22 20h.01" />
                  <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
                  <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.63-.69 1.08-1.36.98c-.65-.09-1.14-.64-1.14-1.26V12a1 1 0 0 0-1-1h-.38a1.97 1.97 0 0 1-1.79-2.77L9 6.88" />
                </svg>
                {t('amazonSupport')}
              </span>
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
          <div className="menu-stripe mt-3" />
          <VisitorCounter />
        </footer>
      </div>
      <PwaInstallPrompt />
    </main>
  )
}
