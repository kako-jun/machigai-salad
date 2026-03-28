'use client'

import { useEffect, useRef } from 'react'

const COUNTER_ID = 'machigai-salad-0b39a12c'

export default function VisitorCounter() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load the nostalgic web component script
    const script = document.createElement('script')
    script.src = 'https://nostalgic.llll-ll.com/components/visit.js'
    script.async = true
    document.head.appendChild(script)

    // Format counter with commas once loaded
    const timer = setInterval(() => {
      const counter = containerRef.current?.querySelector('nostalgic-counter')
      if (counter?.textContent && counter.textContent !== '0') {
        const num = counter.textContent.replace(/,/g, '')
        if (/^\d+$/.test(num)) {
          counter.textContent = parseInt(num).toLocaleString()
        }
        clearInterval(timer)
      }
    }, 100)

    return () => {
      clearInterval(timer)
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  const buildDate = process.env.BUILD_DATE ?? 'dev'

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-between pt-2 text-xs"
      style={{ color: 'var(--muted)', opacity: 0.6 }}
    >
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        <nostalgic-counter id={COUNTER_ID} type="total" format="text"></nostalgic-counter> visits
      </span>
      <span>v{buildDate}</span>
    </div>
  )
}
