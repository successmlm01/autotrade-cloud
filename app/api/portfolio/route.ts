// app/api/portfolio/route.ts
import { NextResponse } from 'next/server'

// Mock portfolio – replace with Supabase query + exchange balance in production
export async function GET() {
  return NextResponse.json({
    totalValue:   12840.52,
    totalPnl:     +2840.52,
    totalPnlPct:  +28.41,
    dailyPnl:     +184.3,
    weeklyPnl:    +620.1,
    monthlyPnl:   +1240.8,
    allocations: [
      { symbol: 'BTC/USDT', value: 6500, pct: 50.6, pnl: +1200 },
      { symbol: 'ETH/USDT', value: 3800, pct: 29.6, pnl:  +840 },
      { symbol: 'BNB/USDT', value: 1540, pct: 12.0, pnl:  +320 },
      { symbol: 'SOL/USDT', value: 1000, pct:  7.8, pnl:  +480 },
    ],
    equityCurve: Array.from({ length: 30 }, (_, i) => ({
      date:  new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' }),
      value: +(10000 + (i * 95) + (Math.sin(i / 3) * 200)).toFixed(0),
    })),
  })
}
