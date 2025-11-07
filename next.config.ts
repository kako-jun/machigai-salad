import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // GitHub Pages用のbasePath設定（環境変数で制御）
  basePath:
    process.env.NODE_ENV === 'production' && process.env.GITHUB_PAGES === 'true'
      ? '/machigai-salad'
      : '',
}

export default nextConfig
