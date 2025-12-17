import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '나의 하루가 피어나다',
  description: '학생-교사 연계 다이어리 웹앱',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

