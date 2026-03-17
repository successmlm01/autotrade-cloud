// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'AutoTrade Cloud – Trading Bot SaaS',
  description: 'Automated crypto trading with RSI, SMA, MACD strategies. Deploy on Vercel, store data in Supabase.',
  keywords:    'trading bot, crypto, binance, RSI, SMA, MACD, automated trading',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-[#0a0a0f] text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
