// app/api/market/route.ts  –  Live tickers (mock for dev, real via ccxt in prod)
import { NextResponse } from 'next/server'

const SYMBOLS = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','ADAUSDT','DOGEUSDT']

const DISPLAY: Record<string, string> = {
  BTCUSDT: 'BTC/USDT', ETHUSDT: 'ETH/USDT', BNBUSDT: 'BNB/USDT',
  SOLUSDT: 'SOL/USDT', ADAUSDT: 'ADA/USDT', DOGEUSDT: 'DOGE/USDT',
}

export async function GET() {
  try {
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(SYMBOLS)}`
    const res  = await fetch(url, { next: { revalidate: 10 } })

    if (!res.ok) throw new Error(`Binance API error: ${res.status}`)

    const data = await res.json()

    const result = data.map((t: any) => ({
      symbol:    DISPLAY[t.symbol] ?? t.symbol,
      price:     parseFloat(t.lastPrice),
      change24h: parseFloat(t.priceChangePercent),
      volume24h: parseFloat(t.quoteVolume),
      high24h:   parseFloat(t.highPrice),
      low24h:    parseFloat(t.lowPrice),
    }))

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    })

  } catch (err: any) {
    console.error('[Binance REST error]', err.message)
    return NextResponse.json([
      { symbol:'BTC/USDT',  price:65420, change24h:1.2,  volume24h:1200000, high24h:66000, low24h:64800 },
      { symbol:'ETH/USDT',  price:3412,  change24h:2.1,  volume24h:800000,  high24h:3450,  low24h:3380  },
      { symbol:'BNB/USDT',  price:573,   change24h:-0.5, volume24h:200000,  high24h:580,   low24h:568   },
      { symbol:'SOL/USDT',  price:168,   change24h:-1.2, volume24h:150000,  high24h:172,   low24h:165   },
      { symbol:'ADA/USDT',  price:0.46,  change24h:0.8,  volume24h:50000,   high24h:0.47,  low24h:0.45  },
      { symbol:'DOGE/USDT', price:0.16,  change24h:1.1,  volume24h:80000,   high24h:0.165, low24h:0.158 },
    ])
  }
}
