import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  env: {
    BUILD_DATE: new Date().toISOString().split('T')[0],
  },
  // GitHub Pages用のbasePath設定（環境変数で制御）
  basePath:
    process.env.NODE_ENV === 'production' && process.env.GITHUB_PAGES === 'true'
      ? '/machigai-salad'
      : '',
}

export default nextConfig
