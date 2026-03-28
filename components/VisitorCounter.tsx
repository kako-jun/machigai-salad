'use client'

import { useEffect, useRef } from 'react'

const COUNTER_ID = 'machigai-salad-5f64915e'

export default function VisitorCounter() {
  const containerRef = useRef<HTMLDivElement>(null)
  const counterRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    // Increment visit count
    fetch(`https://api.nostalgic.llll-ll.com/visit?action=increment&id=${COUNTER_ID}`).catch(
      () => {}
    )

    // Load the nostalgic web component script
    const script = document.createElement('script')
    script.src = 'https://nostalgic.llll-ll.com/components/visit.js'
    script.async = true
    document.head.appendChild(script)

    // Insert custom element via DOM API
    if (counterRef.current && !counterRef.current.querySelector('nostalgic-counter')) {
      const el = document.createElement('nostalgic-counter')
      el.setAttribute('id', COUNTER_ID)
      el.setAttribute('type', 'total')
      counterRef.current.prepend(el)
    }

    // Format counter with commas once loaded
    const timer = setInterval(() => {
      const counter = counterRef.current?.querySelector('nostalgic-counter')
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

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-between pt-2 text-xs"
      style={{ color: 'var(--muted)', opacity: 0.6 }}
    >
      <span ref={counterRef} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {' visits'}
      </span>
      <span>v0.1.0</span>
    </div>
  )
}
