// services/tradingBot.ts — Core trading engine
import type {
  BotConfig, BotState, TradingSignal, CandleData,
  IndicatorSnapshot, SignalStrength, Position, OrderSide,
} from '@/types'

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
  return 100 - (100 / (1 + avgGain / avgLoss))
}

function bollingerBands(closes: number[], period = 20, stdDev = 2) {
  const middle   = sma(closes, period)
  const slice    = closes.slice(-period)
  const variance = slice.reduce((sum, v) => sum + Math.pow(v - middle, 2), 0) / period
  const std      = Math.sqrt(variance)
  return { upper: middle + stdDev * std, middle, lower: middle - stdDev * std }
}

function atr(candles: CandleData[], period = 14): number {
  const trs = candles.slice(-period - 1).map((c, i, arr) => {
    if (i === 0) return c.high - c.low
    const prev = arr[i - 1].close
    return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev))
  })
  return sma(trs, period)
}

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
    rsi: rsi(closes, 14), rsi14: rsi(closes, 14),
    sma20: sma(closes, 20), sma50: sma(closes, 50),
    ema12, ema26,
    macd: macdVal, macdSignal: macdSig, macdHist: macdVal - macdSig,
    bbUpper: bb.upper, bbMiddle: bb.middle, bbLower: bb.lower,
    volume: volumes[volumes.length - 1], volumeMA: sma(volumes, 20),
    atr: atr(candles),
  }
}

export function rsiSmaStrategy(
  ind: IndicatorSnapshot, price: number, params: Record<string, number>
): { side: OrderSide | null; confidence: number; reason: string } {
  const { rsiOversold = 30, rsiOverbought = 70 } = params
  const bullish      = ind.sma20 > ind.sma50
  const bearish      = ind.sma20 < ind.sma50
  const volOk        = ind.volume > ind.volumeMA * 1.2
  const nearLower    = price <= ind.bbLower * 1.01
  const nearUpper    = price >= ind.bbUpper * 0.99

  if (ind.rsi < rsiOversold && bullish && nearLower)
    return { side: 'BUY', confidence: Math.min(95, 60 + (rsiOversold - ind.rsi) + (volOk ? 10 : 0)), reason: `RSI(${ind.rsi.toFixed(1)}) oversold + SMA cross + BB lower` }
  if (ind.rsi < rsiOversold + 5 && bullish && ind.macdHist > 0)
    return { side: 'BUY', confidence: Math.min(85, 55 + (rsiOversold - ind.rsi)), reason: `RSI near oversold + bullish SMA + MACD positive` }
  if (ind.rsi > rsiOverbought && bearish && nearUpper)
    return { side: 'SELL', confidence: Math.min(95, 60 + (ind.rsi - rsiOverbought) + (volOk ? 10 : 0)), reason: `RSI(${ind.rsi.toFixed(1)}) overbought + SMA cross + BB upper` }
  if (ind.rsi > rsiOverbought - 5 && bearish && ind.macdHist < 0)
    return { side: 'SELL', confidence: Math.min(85, 55 + (ind.rsi - rsiOverbought)), reason: `RSI near overbought + bearish SMA + MACD negative` }

  return { side: null, confidence: 0, reason: 'No clear signal' }
}

export function emaCrossStrategy(
  ind: IndicatorSnapshot, _price: number, _params: Record<string, number>
): { side: OrderSide | null; confidence: number; reason: string } {
  const volOk = ind.volume > ind.volumeMA
  if (ind.ema12 > ind.ema26 && ind.macd > ind.macdSignal && ind.macdHist > 0)
    return { side: 'BUY', confidence: volOk ? 78 : 65, reason: `EMA12 > EMA26 + MACD bullish crossover` }
  if (ind.ema12 < ind.ema26 && ind.macd < ind.macdSignal && ind.macdHist < 0)
    return { side: 'SELL', confidence: volOk ? 78 : 65, reason: `EMA12 < EMA26 + MACD bearish crossover` }
  return { side: null, confidence: 0, reason: 'Waiting for EMA cross confirmation' }
}

export function generateSignal(config: BotConfig, candles: CandleData[]): TradingSignal | null {
  if (candles.length < 60) return null
  const indicators = computeIndicators(candles)
  const price      = candles[candles.length - 1].close
  const result     = config.strategy.type === 'ema_cross'
    ? emaCrossStrategy(indicators, price, config.strategy.params)
    : rsiSmaStrategy(indicators, price, config.strategy.params)

  if (!result.side) return null
  const strength: SignalStrength =
    result.confidence >= 85 ? (result.side === 'BUY' ? 'STRONG_BUY' : 'STRONG_SELL') :
    result.confidence >= 65 ? result.side : 'NEUTRAL'

  return { symbol: config.symbol, side: result.side, strength, confidence: result.confidence, price, indicators, timestamp: new Date().toISOString(), reason: result.reason }
}

export function shouldClosePosition(position: Position, currentPrice: number, config: BotConfig): { close: boolean; reason: string } {
  const pnlPct       = ((currentPrice - position.entryPrice) / position.entryPrice) * 100
  const actualPnlPct = pnlPct * (position.side === 'BUY' ? 1 : -1)
  if (actualPnlPct >= config.takeProfitPct)  return { close: true, reason: `Take profit: +${actualPnlPct.toFixed(2)}%` }
  if (actualPnlPct <= -config.stopLossPct)   return { close: true, reason: `Stop loss: ${actualPnlPct.toFixed(2)}%` }
  return { close: false, reason: '' }
}

export function calcPositionSize(capital: number, price: number, riskPercent: number): number {
  return (capital * (riskPercent / 100)) / price
}

export async function runBot(config: BotConfig, state: BotState): Promise<{
  signal: TradingSignal | null; updatedState: Partial<BotState>
}> {
  const candles = generateMockCandles(config.symbol, 200)
  const signal  = generateSignal(config, candles)
  return { signal, updatedState: { lastSignal: signal, lastUpdated: new Date().toISOString() } }
}

export function generateMockCandles(symbol: string, count = 100): CandleData[] {
  const seed   = symbol.charCodeAt(0) * 1000
  const base   = symbol.startsWith('BTC') ? 65000 : symbol.startsWith('ETH') ? 3400 : 100
  const candles: CandleData[] = []
  let price = base
  const now = Date.now()
  for (let i = count; i >= 0; i--) {
    const change = (Math.sin(i / 8 + seed) + Math.random() - 0.48) * base * 0.008
    price = Math.max(base * 0.5, price + change)
    candles.push({
      timestamp: now - i * 3600000,
      open:  price - change,
      high:  price * (1 + Math.random() * 0.005),
      low:   price * (1 - Math.random() * 0.005),
      close: price,
      volume: base * (0.5 + Math.random()),
    })
  }
  return candles
}
