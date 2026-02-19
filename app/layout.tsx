import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '小エビの間違いサラダ',
  description: '間違い探しをかんたんに解くおたすけツール',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  )
}
