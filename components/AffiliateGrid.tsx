'use client'

// Amazon affiliate × 3 grid.
//
// orber の AffiliateGrid (Solid.js) を machigai-salad (React / Next.js) 向けに移植。
// データ層は `lib/affiliateProducts.ts` に分離。
// CSS トークンは machigai-salad の globals.css 変数 (--foreground / --muted /
// --border / --background / --golden 等) を使用する。

import { useI18n } from '../lib/i18n'
import { AFFILIATE_PRODUCTS } from '../lib/affiliateProducts'

export default function AffiliateGrid() {
  const { t } = useI18n()

  return (
    <section aria-label={t('amazonSupport')} className="w-full">
      <ul className="m-0 grid w-full list-none grid-cols-3 gap-3 p-0 sm:gap-4">
        {AFFILIATE_PRODUCTS.map((p) => (
          <li key={p.url}>
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer sponsored nofollow"
              title={p.title}
              className="group block focus-visible:outline-none focus-visible:ring-2"
              style={{ '--tw-ring-color': 'var(--golden)' } as React.CSSProperties}
            >
              {/* 円形 orb 画像 */}
              <div
                className="relative mx-auto aspect-square w-full overflow-hidden rounded-full transition-transform duration-200 ease-out group-hover:scale-105"
                style={{
                  background: 'var(--background)',
                  boxShadow: 'inset 0 0 14px rgba(0,0,0,0.3), 0 0 10px rgba(0,0,0,0.12)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl}
                  alt={p.title}
                  loading="lazy"
                  decoding="async"
                  width={120}
                  height={120}
                  className="absolute inset-0 h-full w-full scale-110 object-cover transition-transform duration-200 ease-out group-hover:scale-[1.18]"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.visibility = 'hidden'
                  }}
                />
                {/* hover overlay */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100"
                  style={{
                    boxShadow: '0 0 18px rgba(180,140,60,0.2), inset 0 0 8px rgba(180,140,60,0.08)',
                  }}
                />
              </div>
              {/* キャプション + タイトル */}
              <div className="mt-2 text-center">
                {p.caption && (
                  <div
                    className="line-clamp-2 text-xs leading-tight"
                    style={{ color: 'var(--muted)' }}
                  >
                    {p.caption}
                  </div>
                )}
                <div
                  className="mt-0.5 truncate text-xs leading-tight"
                  style={{ color: 'var(--muted)', opacity: 0.7 }}
                >
                  {p.title}
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>
      <p
        className="mt-3 whitespace-pre-line text-center text-xs"
        style={{ color: 'var(--muted)', opacity: 0.7 }}
      >
        {t('amazonHint')}
      </p>
    </section>
  )
}
