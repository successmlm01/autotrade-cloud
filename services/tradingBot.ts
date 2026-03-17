// ──────────────────────────────────────────────────────────────────
// services/tradingBot.ts  –  Core trading engine
// ──────────────────────────────────────────────────────────────────
import type {
  BotConfig, BotState, TradingSignal, CandleData,
  IndicatorSnapshot, SignalStrength, Position, OrderSide,
} from '@/types'

// ── Technical indicator helpers ────────────────────────────────────

function sma(values: number[], period: number): number {
  const slice = values.slice(-period)
  if (slice.length < period) return 0
  return slice.reduce((a, b) => a + b, 0) / period
}

function ema(values: number[], period: number): number {
  if (values.length < period) return 0
  const k = 2 / (period + 1)
  let result = sma(values.slice(0, period), period)
  for (let i = period; i < values.length; i++) {
    result = values[i] * k + result * (1 - k)
  }
  return result
}

function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50
  let gains = 0, losses = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff >= 0) gains += diff
    else losses -= diff
  }
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function bollingerBands(closes: number[], period = 20, stdDev = 2) {
  const middle = sma(closes, period)
  const slice = closes.slice(-period)
  const variance = slice.reduce((sum, v) => sum + Math.pow(v - middle, 2), 0) / period
  const std = Math.sqrt(variance)
  return {
    upper: middle + stdDev * std,
    middle,
    lower: middle - stdDev * std,
  }
}

function atr(candles: CandleData[], period = 14): number {
  const trs = candles.slice(-period - 1).map((c, i, arr) => {
    if (i === 0) return c.high - c.low
    const prevClose = arr[i - 1].close
    return Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose))
  })
  return sma(trs, period)
}

// ── Indicator computation ──────────────────────────────────────────

export function computeIndicators(candles: CandleData[]): IndicatorSnapshot {
  const closes  = candles.map(c => c.close)
  const volumes = candles.map(c => c.volume)

  const ema12   = ema(closes, 12)
  const ema26   = ema(closes, 26)
  const macdVal = ema12 - ema26
  const macdSig = ema([...closes.slice(-35).map((_, i) => {
    const sub = closes.slice(0, closes.length - 35 + i + 1)
    return ema(sub, 12) - ema(sub, 26)
  })], 9)

  const bb = bollingerBands(closes)

  return {
    rsi:        rsi(closes, 14),
    rsi14:      rsi(closes, 14),
    sma20:      sma(closes, 20),
    sma50:      sma(closes, 50),
    ema12,
    ema26,
    macd:       macdVal,
    macdSignal: macdSig,
    macdHist:   macdVal - macdSig,
    bbUpper:    bb.upper,
    bbMiddle:   bb.middle,
    bbLower:    bb.lower,
    volume:     volumes[volumes.length - 1],
    volumeMA:   sma(volumes, 20),
    atr:        atr(candles),
  }
}

// ── Strategy: RSI + SMA crossover ─────────────────────────────────

export function rsiSmaStrategy(
  ind: IndicatorSnapshot,
  price: number,
  params: Record<string, number>
): { side: OrderSide | null; confidence: number; reason: string } {
  const {
    rsiOversold    = 30,
    rsiOverbought  = 70,
  } = params

  const isBullishCross = ind.sma20 > ind.sma50
  const isBearishCross = ind.sma20 < ind.sma50
  const volumeConfirm  = ind.volume > ind.volumeMA * 1.2
  const nearBBLower    = price <= ind.bbLower * 1.01
  const nearBBUpper    = price >= ind.bbUpper * 0.99

  // BUY conditions
  if (ind.rsi < rsiOversold && isBullishCross && nearBBLower) {
    const conf = Math.min(95, 60 + (rsiOversold - ind.rsi) + (volumeConfirm ? 10 : 0))
    return { side: 'BUY', confidence: conf, reason: `RSI(${ind.rsi.toFixed(1)}) oversold + SMA cross + BB lower touch` }
  }
  if (ind.rsi < rsiOversold + 5 && isBullishCross && ind.macdHist > 0) {
    const conf = Math.min(85, 55 + (rsiOversold - ind.rsi))
    return { side: 'BUY', confidence: conf, reason: `RSI near oversold + bullish SMA + MACD positive` }
  }

  // SELL conditions
  if (ind.rsi > rsiOverbought && isBearishCross && nearBBUpper) {
    const conf = Math.min(95, 60 + (ind.rsi - rsiOverbought) + (volumeConfirm ? 10 : 0))
    return { side: 'SELL', confidence: conf, reason: `RSI(${ind.rsi.toFixed(1)}) overbought + SMA cross + BB upper touch` }
  }
  if (ind.rsi > rsiOverbought - 5 && isBearishCross && ind.macdHist < 0) {
    const conf = Math.min(85, 55 + (ind.rsi - rsiOverbought))
    return { side: 'SELL', confidence: conf, reason: `RSI near overbought + bearish SMA + MACD negative` }
  }

  return { side: null, confidence: 0, reason: 'No clear signal' }
}

// ── Strategy: EMA crossover ────────────────────────────────────────

export function emaCrossStrategy(
  ind: IndicatorSnapshot,
  _price: number,
  _params: Record<string, number>
): { side: OrderSide | null; confidence: number; reason: string } {
  const macdBullish = ind.macd > ind.macdSignal && ind.macdHist > 0
  const macdBearish = ind.macd < ind.macdSignal && ind.macdHist < 0
  const volumeConfirm = ind.volume > ind.volumeMA

  if (ind.ema12 > ind.ema26 && macdBullish) {
    const conf = volumeConfirm ? 78 : 65
    return { side: 'BUY', confidence: conf, reason: `EMA12 > EMA26 + MACD bullish crossover` }
  }
  if (ind.ema12 < ind.ema26 && macdBearish) {
    const conf = volumeConfirm ? 78 : 65
    return { side: 'SELL', confidence: conf, reason: `EMA12 < EMA26 + MACD bearish crossover` }
  }

  return { side: null, confidence: 0, reason: 'Waiting for EMA cross confirmation' }
}

// ── Signal dispatcher ──────────────────────────────────────────────

export function generateSignal(
  config: BotConfig,
  candles: CandleData[]
): TradingSignal | null {
  if (candles.length < 60) return null

  const indicators = computeIndicators(candles)
  const price      = candles[candles.length - 1].close
  let result: { side: OrderSide | null; confidence: number; reason: string }

  switch (config.strategy.type) {
    case 'rsi_sma':
      result = rsiSmaStrategy(indicators, price, config.strategy.params)
      break
    case 'ema_cross':
      result = emaCrossStrategy(indicators, price, config.strategy.params)
      break
    default:
      result = rsiSmaStrategy(indicators, price, config.strategy.params)
  }

  if (!result.side) return null

  const strength: SignalStrength =
    result.confidence >= 85 ? (result.side === 'BUY' ? 'STRONG_BUY' : 'STRONG_SELL') :
    result.confidence >= 65 ? result.side :
    'NEUTRAL'

  return {
    symbol:     config.symbol,
    side:       result.side,
    strength,
    confidence: result.confidence,
    price,
    indicators,
    timestamp:  new Date().toISOString(),
    reason:     result.reason,
  }
}

// ── Position management ────────────────────────────────────────────

export function shouldClosePosition(
  position: Position,
  currentPrice: number,
  config: BotConfig
): { close: boolean; reason: string } {
  const pnlPct = ((currentPrice - position.entryPrice) / position.entryPrice) * 100
  const sign   = position.side === 'BUY' ? 1 : -1
  const actualPnlPct = pnlPct * sign

  if (actualPnlPct >= config.takeProfitPct)
    return { close: true, reason: `Take profit hit: +${actualPnlPct.toFixed(2)}%` }

  if (actualPnlPct <= -config.stopLossPct)
    return { close: true, reason: `Stop loss hit: ${actualPnlPct.toFixed(2)}%` }

  return { close: false, reason: '' }
}

export function calcPositionSize(capital: number, price: number, riskPercent: number): number {
  const riskAmount = capital * (riskPercent / 100)
  return riskAmount / price
}

// ── Bot runner (called from API route) ────────────────────────────

export async function runBot(config: BotConfig, state: BotState): Promise<{
  signal: TradingSignal | null
  updatedState: Partial<BotState>
}> {
  // In production: fetch real candles from exchange via ccxt
  // Here we generate realistic mock data for demo/dev mode
  const candles = generateMockCandles(config.symbol, 200)
  const signal  = generateSignal(config, candles)

  return {
    signal,
    updatedState: {
      lastSignal:  signal,
      lastUpdated: new Date().toISOString(),
    }
  }
}

// ── Mock candle generator (dev / CI) ──────────────────────────────

export function generateMockCandles(symbol: string, count = 100): CandleData[] {
  const seed   = symbol.charCodeAt(0) * 1000
  const base   = symbol.startsWith('BTC') ? 65000 : symbol.startsWith('ETH') ? 3400 : 100
  const candles: CandleData[] = []
  let price = base

  const now = Date.now()
  for (let i = count; i >= 0; i--) {
    const change = (Math.sin(i / 8 + seed) + Math.random() - 0.48) * base * 0.008
    price = Math.max(base * 0.5, price + change)
    const high = price * (1 + Math.random() * 0.005)
    const low  = price * (1 - Math.random() * 0.005)
    candles.push({
      timestamp: now - i * 3600000,
      open:      price - change,
      high,
      low,
      close:     price,
      volume:    base * (0.5 + Math.random()),
    })
  }
  return candles
}
