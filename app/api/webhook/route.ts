// app/api/webhook/route.ts
// Receive external signals (TradingView Pine Script alerts, etc.)
// TradingView webhook URL: https://your-app.vercel.app/api/webhook
// Payload example:
// { "secret": "your_secret", "symbol": "BTC/USDT", "side": "BUY", "confidence": 80, "strategy": "custom" }

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { secret, symbol, side, confidence = 75, strategy = 'webhook', botId } = body

    // Validate webhook secret
    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!symbol || !side || !['BUY','SELL'].includes(side)) {
      return NextResponse.json({ error: 'Missing or invalid fields: symbol, side (BUY|SELL)' }, { status: 400 })
    }

    const signal = {
      symbol, side, confidence,
      strength: confidence >= 80 ? `STRONG_${side}` : side,
      price: 0, // Will be filled by exchange in production
      strategy,
      timestamp: new Date().toISOString(),
      reason: `Webhook signal from ${strategy}`,
      indicators: {},
    }

    // In production: find active bots for this symbol and execute order
    // For now: log signal to Supabase
    const db = supabaseAdmin()
    await db.from('bot_states')
      .update({ last_signal: signal, last_updated: new Date().toISOString() })
      .eq('config_id', botId)
      .neq('status', 'stopped')

    console.log('[Webhook Signal]', signal)

    return NextResponse.json({ received: true, signal })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET: health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'AutoTrade Cloud Webhook',
    accepts: {
      method: 'POST',
      body: {
        secret:     'string (required) — set WEBHOOK_SECRET in Vercel env vars',
        symbol:     'string — e.g. BTC/USDT',
        side:       'BUY | SELL',
        confidence: 'number 0-100 (optional)',
        botId:      'uuid (optional) — target specific bot',
        strategy:   'string (optional) — strategy name',
      }
    },
    tradingview_example: {
      url: '{{strategy.order.action}} signal',
      body: '{"secret":"{{YOUR_SECRET}}","symbol":"{{ticker}}","side":"{{strategy.order.action}}","confidence":80}',
    }
  })
}
