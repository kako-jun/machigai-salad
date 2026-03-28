import type { NextConfig } from 'next'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// Use JST (UTC+9) for build date to match user's timezone
const BUILD_DATE = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]

// Stamp build date into sw.js cache name (production only to avoid polluting git)
if (process.env.NODE_ENV === 'production') {
  const swPath = join(__dirname, 'public', 'sw.js')
  const swContent = readFileSync(swPath, 'utf-8')
  writeFileSync(
    swPath,
    swContent.replace(
      /machigai-salad-(?:__BUILD_DATE__|\d{4}-\d{2}-\d{2})/,
      `machigai-salad-${BUILD_DATE}`
    )
  )
}

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  env: {
    BUILD_DATE,
  },
  // GitHub Pages用のbasePath設定（環境変数で制御）
  basePath:
    process.env.NODE_ENV === 'production' && process.env.GITHUB_PAGES === 'true'
      ? '/machigai-salad'
      : '',
}

export default nextConfig
