'use client'

import { useI18n } from '@/lib/i18n'
import { saveLang } from '@/lib/storage'

// URL is the source of truth for language: JA = `/`, EN = `/en`. The toggle
// navigates between the two roots (a full load, since they are separate root
// layouts) and records the choice so the `/` route's auto-detect respects it.
const base = process.env.NEXT_PUBLIC_BASE_PATH || ''

export default function LangToggle() {
  const { lang } = useI18n()

  const linkStyle = (active: boolean) => ({
    fontWeight: active ? 700 : 400,
    color: active ? 'var(--olive)' : 'var(--muted)',
    background: active ? 'rgba(107,127,62,0.15)' : 'transparent',
  })

  return (
    <div className="flex items-center text-xs" style={{ color: 'var(--muted)' }}>
      <a
        href={`${base}/`}
        onClick={() => saveLang('ja')}
        className="rounded px-2 py-2"
        style={linkStyle(lang === 'ja')}
        aria-label="日本語"
      >
        JA
      </a>
      <span className="mx-1" style={{ fontSize: 10, opacity: 0.5 }}>
        /
      </span>
      <a
        href={`${base}/en`}
        onClick={() => saveLang('en')}
        className="rounded px-2 py-2"
        style={linkStyle(lang === 'en')}
        aria-label="English"
      >
        EN
      </a>
    </div>
  )
}
