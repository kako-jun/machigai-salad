'use client'

import { useI18n } from '@/lib/i18n'
import ImageProcessor from '@/components/ImageProcessor'
import LangToggle from '@/components/LangToggle'
import PwaInstallPrompt from '@/components/PwaInstallPrompt'
import VisitorCounter from '@/components/VisitorCounter'
import ShareButtons from '@/components/ShareButtons'

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
                  stroke="var(--error)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {/* Cracker cone */}
                  <path d="M2 22 8.5 11.5 12.5 15.5Z" />
                  {/* Burst lines */}
                  <line x1="12" y1="10" x2="15" y2="4" />
                  <line x1="14" y1="13" x2="20" y2="10" />
                  <line x1="10" y1="8" x2="8" y2="3" />
                  {/* Confetti dots */}
                  <circle cx="18" cy="5" r="1" fill="var(--error)" stroke="none" />
                  <circle cx="21" cy="12" r="1" fill="var(--error)" stroke="none" />
                  <circle cx="16" cy="16" r="1" fill="var(--error)" stroke="none" />
                  <circle cx="6" cy="5" r="0.8" fill="var(--error)" stroke="none" />
                  <circle cx="20" cy="18" r="0.8" fill="var(--error)" stroke="none" />
                </svg>
                {t('amazonSupport')}
              </span>
              <span className="whitespace-pre-line text-xs" style={{ color: 'var(--muted)' }}>
                {t('amazonHint')}
              </span>
            </a>

            {/* QR Code + Share buttons */}
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/static/qr.webp"
                alt="QR code"
                width={120}
                height={120}
                className="rounded"
              />
              <ShareButtons />
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
