// app/api/market/route.ts  –  Live tickers (mock for dev, real via ccxt in prod)
import { NextResponse } from 'next/server'
import ccxt from 'ccxt'

const SYMBOLS = ['BTC/USDT','ETH/USDT','BNB/USDT','SOL/USDT','ADA/USDT','DOGE/USDT']

export async function GET() {
  try {
    const exchange = new ccxt.binance({
      apiKey:          process.env.BINANCE_API_KEY,
      secret:          process.env.BINANCE_SECRET_KEY,
      enableRateLimit: true,
    })

    const tickers = await exchange.fetchTickers(SYMBOLS)

    const result = SYMBOLS.map(symbol => ({
      symbol,
      price:     tickers[symbol]?.last        ?? 0,
      change24h: tickers[symbol]?.percentage  ?? 0,
      volume24h: tickers[symbol]?.quoteVolume ?? 0,
      high24h:   tickers[symbol]?.high        ?? 0,
      low24h:    tickers[symbol]?.low         ?? 0,
    }))

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    })

  } catch (err: any) {
    console.error('[Binance market error]', err.message)
    // Fallback mock si Binance inaccessible
    return NextResponse.json([
      { symbol:'BTC/USDT', price:65420, change24h:1.2,  volume24h:1200000, high24h:66000, low24h:64800 },
      { symbol:'ETH/USDT', price:3412,  change24h:2.1,  volume24h:800000,  high24h:3450,  low24h:3380  },
      { symbol:'BNB/USDT', price:573,   change24h:-0.5, volume24h:200000,  high24h:580,   low24h:568   },
      { symbol:'SOL/USDT', price:168,   change24h:-1.2, volume24h:150000,  high24h:172,   low24h:165   },
      { symbol:'ADA/USDT', price:0.46,  change24h:0.8,  volume24h:50000,   high24h:0.47,  low24h:0.45  },
      { symbol:'DOGE/USDT',price:0.16,  change24h:1.1,  volume24h:80000,   high24h:0.165, low24h:0.158 },
    ])
  }
}
