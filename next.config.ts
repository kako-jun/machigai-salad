import type { NextConfig } from 'next'

// Use JST (UTC+9) for build date to match user's timezone
const BUILD_DATE = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]

const basePath =
  process.env.NODE_ENV === 'production' && process.env.GITHUB_PAGES === 'true'
    ? '/machigai-salad'
    : ''

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  env: {
    BUILD_DATE,
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  basePath,
}

export default nextConfig
