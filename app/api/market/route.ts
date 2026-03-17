// app/api/market/route.ts  –  Live tickers (mock for dev, real via ccxt in prod)
import { NextResponse } from 'next/server'
import type { MarketTicker } from '@/types'

// In production: replace with ccxt exchange.fetchTickers(['BTC/USDT','ETH/USDT',...])
function getMockTickers(): MarketTicker[] {
  const base: Record<string, number> = {
    'BTC/USDT': 65420,
    'ETH/USDT': 3412,
    'BNB/USDT': 573,
    'SOL/USDT': 168,
    'ADA/USDT': 0.46,
    'DOGE/USDT': 0.16,
  }

  return Object.entries(base).map(([symbol, price]) => {
    const change = (Math.random() - 0.48) * price * 0.04
    return {
      symbol,
      price:    +(price + change * Math.random()).toFixed(2),
      change24h: +((Math.random() - 0.45) * 8).toFixed(2),
      volume24h: +(price * (1000 + Math.random() * 5000)).toFixed(0),
      high24h:   +(price * 1.03).toFixed(2),
      low24h:    +(price * 0.97).toFixed(2),
    }
  })
}

export async function GET() {
  const tickers = getMockTickers()
  return NextResponse.json(tickers, {
    headers: { 'Cache-Control': 'no-store, max-age=0' }
  })
}
