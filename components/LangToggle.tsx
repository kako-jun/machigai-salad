'use client'

import { useI18n } from '@/lib/i18n'

export default function LangToggle() {
  const { lang, setLang } = useI18n()

  return (
    <div className="absolute right-3 top-3 flex gap-1 text-xs" style={{ color: 'var(--muted)' }}>
      <button
        onClick={() => setLang('ja')}
        className="rounded px-1.5 py-0.5"
        style={{
          fontWeight: lang === 'ja' ? 700 : 400,
          color: lang === 'ja' ? 'var(--espresso)' : 'var(--muted)',
          background: lang === 'ja' ? 'rgba(212,160,16,0.15)' : 'transparent',
        }}
      >
        JA
      </button>
      <span>/</span>
      <button
        onClick={() => setLang('en')}
        className="rounded px-1.5 py-0.5"
        style={{
          fontWeight: lang === 'en' ? 700 : 400,
          color: lang === 'en' ? 'var(--espresso)' : 'var(--muted)',
          background: lang === 'en' ? 'rgba(212,160,16,0.15)' : 'transparent',
        }}
      >
        EN
      </button>
    </div>
  )
}
