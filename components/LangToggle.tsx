'use client'

import { useI18n } from '@/lib/i18n'

export default function LangToggle() {
  const { lang, setLang } = useI18n()

  return (
    <div className="flex items-center text-xs" style={{ color: 'var(--muted)' }}>
      <button
        onClick={() => setLang('ja')}
        className="rounded px-2 py-2"
        style={{
          fontWeight: lang === 'ja' ? 700 : 400,
          color: lang === 'ja' ? 'var(--olive)' : 'var(--muted)',
          background: lang === 'ja' ? 'rgba(107,127,62,0.15)' : 'transparent',
        }}
        aria-label="日本語"
      >
        JA
      </button>
      <span className="mx-1" style={{ fontSize: 10, opacity: 0.5 }}>
        /
      </span>
      <button
        onClick={() => setLang('en')}
        className="rounded px-2 py-2"
        style={{
          fontWeight: lang === 'en' ? 700 : 400,
          color: lang === 'en' ? 'var(--olive)' : 'var(--muted)',
          background: lang === 'en' ? 'rgba(107,127,62,0.15)' : 'transparent',
        }}
        aria-label="English"
      >
        EN
      </button>
    </div>
  )
}
