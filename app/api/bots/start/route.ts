// app/api/bots/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runBot } from '@/services/tradingBot'
import type { BotConfig, BotState } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { botId } = await req.json()
    if (!botId) return NextResponse.json({ error: 'botId required' }, { status: 400 })

    const db = supabaseAdmin()

    // Load config
    const { data: configRow, error: cfgErr } = await db
      .from('bot_configs')
      .select('*')
      .eq('id', botId)
      .single()

    if (cfgErr || !configRow) {
      // Dev/demo mode: return a mock started signal
      const mockSignal = {
        symbol: 'BTC/USDT',
        side: 'BUY' as const,
        strength: 'STRONG_BUY' as const,
        confidence: 82,
        price: 65420.50,
        indicators: {
          rsi: 28.4, rsi14: 28.4, sma20: 64800, sma50: 63200,
          ema12: 65100, ema26: 64300, macd: 800, macdSignal: 650,
          macdHist: 150, bbUpper: 67000, bbMiddle: 64800, bbLower: 62600,
          volume: 1240000, volumeMA: 980000, atr: 850,
        },
        timestamp: new Date().toISOString(),
        reason: 'RSI(28.4) oversold + SMA cross + BB lower touch',
      }
      return NextResponse.json({ message: 'Bot started 🚀', signal: mockSignal, mode: 'demo' })
    }

    // Map DB row → BotConfig
    const config: BotConfig = {
      id:             configRow.id,
      name:           configRow.name,
      symbol:         configRow.symbol,
      exchange:       configRow.exchange,
      timeframe:      configRow.timeframe,
      strategy:       { type: configRow.strategy_type as any, params: configRow.strategy_params },
      riskPercent:    configRow.risk_percent,
      takeProfitPct:  configRow.take_profit_pct,
      stopLossPct:    configRow.stop_loss_pct,
      maxPositions:   configRow.max_positions,
      enabled:        true,
    }

    // Load current state (or create if missing)
    let { data: stateRow } = await db
      .from('bot_states')
      .select('*')
      .eq('config_id', botId)
      .single()

    const state: BotState = stateRow
      ? {
          id: stateRow.id, configId: stateRow.config_id, status: stateRow.status,
          capital: stateRow.capital, openPositions: [], totalTrades: stateRow.total_trades,
          winRate: stateRow.win_rate, totalPnl: stateRow.total_pnl,
          lastSignal: stateRow.last_signal, lastUpdated: stateRow.last_updated,
        }
      : {
          id: '', configId: botId, status: 'stopped', capital: 1000,
          openPositions: [], totalTrades: 0, winRate: 0, totalPnl: 0,
          lastSignal: null, lastUpdated: new Date().toISOString(),
        }

    // Run the bot engine
    const { signal, updatedState } = await runBot(config, state)

    // Persist state update
    await db.from('bot_states').upsert({
      config_id:   botId,
      user_id:     configRow.user_id,
      status:      'running',
      capital:     state.capital,
      total_trades: state.totalTrades,
      win_rate:    state.winRate,
      total_pnl:   state.totalPnl,
      last_signal: signal,
      last_updated: new Date().toISOString(),
    }, { onConflict: 'config_id' })

    return NextResponse.json({
      message:  'Bot started 🚀',
      signal,
      updatedState,
    })
  } catch (err: any) {
    console.error('[Bot Start Error]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
