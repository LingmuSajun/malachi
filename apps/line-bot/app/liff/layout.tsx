export const metadata = { title: 'Malachi — カード鑑定' }

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0, background: '#0d0a1a', color: '#f0e6d3', fontFamily: 'sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
