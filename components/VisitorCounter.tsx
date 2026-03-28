'use client'

import { useEffect, useRef } from 'react'
import { useI18n } from '@/lib/i18n'

const COUNTER_ID = 'machigai-salad-0b39a12c'
const MAX_POLL_ATTEMPTS = 50 // 5 seconds max

export default function VisitorCounter() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { t } = useI18n()

  useEffect(() => {
    // Load the nostalgic web component script (idempotent)
    if (!document.querySelector('script[src*="nostalgic"]')) {
      const script = document.createElement('script')
      script.src = 'https://nostalgic.llll-ll.com/components/visit.js'
      script.async = true
      document.head.appendChild(script)
    }

    // Format counter with commas once loaded (with max attempts)
    let attempts = 0
    const timer = setInterval(() => {
      attempts++
      if (attempts >= MAX_POLL_ATTEMPTS) {
        clearInterval(timer)
        return
      }
      const counter = containerRef.current?.querySelector('nostalgic-counter')
      if (counter?.textContent && counter.textContent !== '0') {
        const num = counter.textContent.replace(/,/g, '')
        if (/^\d+$/.test(num)) {
          counter.textContent = parseInt(num).toLocaleString()
        }
        clearInterval(timer)
      }
    }, 100)

    return () => clearInterval(timer)
  }, [])

  const buildDate = process.env.BUILD_DATE ?? 'dev'

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-between pt-2 text-xs"
      style={{ color: 'var(--muted)', opacity: 0.6 }}
    >
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        <nostalgic-counter id={COUNTER_ID} type="total" format="text"></nostalgic-counter>{' '}
        {t('visitsLabel')}
      </span>
      <span>v{buildDate}</span>
    </div>
  )
}
