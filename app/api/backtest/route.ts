// app/api/backtest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { runBacktest } from '@/services/backtest'
import { generateMockCandles } from '@/services/tradingBot'
import type { BotConfig } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { symbol, strategyType, params, riskPercent, takeProfitPct, stopLossPct, initialCapital = 1000, candleCount = 500 } = body

    const config: BotConfig = {
      id: 'backtest', name: 'Backtest', symbol: symbol || 'BTC/USDT',
      exchange: 'binance', timeframe: '1h',
      strategy: { type: strategyType || 'rsi_sma', params: params || { rsiOversold:30, rsiOverbought:70, smaFast:20, smaSlow:50 } },
      riskPercent:   riskPercent   || 2,
      takeProfitPct: takeProfitPct || 3,
      stopLossPct:   stopLossPct   || 1.5,
      maxPositions:  3, enabled: true,
    }

    const candles = generateMockCandles(symbol || 'BTC/USDT', candleCount)
    const result  = runBacktest(config, candles, initialCapital)

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
