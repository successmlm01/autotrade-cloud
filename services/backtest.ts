// services/backtest.ts — Moteur de backtesting
import { generateMockCandles, computeIndicators, rsiSmaStrategy, emaCrossStrategy } from './tradingBot'
import type { BotConfig, CandleData, Trade, IndicatorSnapshot } from '@/types'

export interface BacktestResult {
  totalTrades:   number
  winRate:       number
  totalPnl:      number
  totalPnlPct:   number
  maxDrawdown:   number
  sharpeRatio:   number
  profitFactor:  number
  avgWin:        number
  avgLoss:       number
  bestTrade:     number
  worstTrade:    number
  equityCurve:   { i: number; equity: number; date: string }[]
  trades:        SimulatedTrade[]
}

interface SimulatedTrade {
  side:       'BUY' | 'SELL'
  entryPrice: number
  exitPrice:  number
  entryIdx:   number
  exitIdx:    number
  pnlPct:     number
  pnl:        number
}

export function runBacktest(
  config: BotConfig,
  candles: CandleData[],
  initialCapital = 1000
): BacktestResult {
  const trades: SimulatedTrade[] = []
  let capital  = initialCapital
  let inTrade  = false
  let entry    = 0
  let side: 'BUY' | 'SELL' = 'BUY'
  let entryIdx = 0

  const equityCurve: { i: number; equity: number; date: string }[] = []
  let peak = capital

  for (let i = 60; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1)
    const ind   = computeIndicators(slice)
    const price = candles[i].close

    if (!inTrade) {
      // Check for entry signal
      const signal =
        config.strategy.type === 'ema_cross'
          ? emaCrossStrategy(ind, price, config.strategy.params)
          : rsiSmaStrategy(ind, price, config.strategy.params)

      if (signal.side && signal.confidence >= 60) {
        inTrade  = true
        entry    = price
        side     = signal.side
        entryIdx = i
      }
    } else {
      // Check exit conditions
      const pnlPct = ((price - entry) / entry) * 100
      const actualPnlPct = side === 'BUY' ? pnlPct : -pnlPct

      const hit_tp = actualPnlPct  >= config.takeProfitPct
      const hit_sl = actualPnlPct  <= -config.stopLossPct

      if (hit_tp || hit_sl) {
        const tradePnlPct = hit_tp ? config.takeProfitPct : -config.stopLossPct
        const fee         = capital * 0.001 // 0.1% fee
        const tradePnl    = capital * (tradePnlPct / 100) - fee

        capital += tradePnl
        peak     = Math.max(peak, capital)

        trades.push({
          side, entryPrice: entry, exitPrice: price,
          entryIdx, exitIdx: i,
          pnlPct: tradePnlPct, pnl: tradePnl,
        })

        equityCurve.push({
          i, equity: Math.round(capital),
          date: new Date(candles[i].timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        })
        inTrade = false
      }
    }
  }

  if (trades.length === 0) {
    return { totalTrades:0, winRate:0, totalPnl:0, totalPnlPct:0, maxDrawdown:0, sharpeRatio:0, profitFactor:0, avgWin:0, avgLoss:0, bestTrade:0, worstTrade:0, equityCurve:[], trades:[] }
  }

  const wins   = trades.filter(t => t.pnl > 0)
  const losses = trades.filter(t => t.pnl <= 0)

  const winRate     = (wins.length / trades.length) * 100
  const totalPnl    = capital - initialCapital
  const totalPnlPct = (totalPnl / initialCapital) * 100
  const avgWin      = wins.length   ? wins.reduce((s, t) => s + t.pnlPct, 0)   / wins.length   : 0
  const avgLoss     = losses.length ? losses.reduce((s, t) => s + t.pnlPct, 0) / losses.length : 0
  const profitFactor = losses.length && avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 999

  // Max drawdown
  let maxDrawdown = 0, runPeak = initialCapital
  let equity = initialCapital
  for (const t of trades) {
    equity += t.pnl
    runPeak = Math.max(runPeak, equity)
    const dd = (runPeak - equity) / runPeak * 100
    maxDrawdown = Math.max(maxDrawdown, dd)
  }

  // Simplified Sharpe (annualised)
  const returns = trades.map(t => t.pnlPct / 100)
  const meanRet = returns.reduce((s, r) => s + r, 0) / returns.length
  const stdRet  = Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - meanRet, 2), 0) / returns.length)
  const sharpeRatio = stdRet > 0 ? (meanRet / stdRet) * Math.sqrt(252) : 0

  return {
    totalTrades: trades.length,
    winRate:     +winRate.toFixed(1),
    totalPnl:    +totalPnl.toFixed(2),
    totalPnlPct: +totalPnlPct.toFixed(2),
    maxDrawdown: +maxDrawdown.toFixed(2),
    sharpeRatio: +sharpeRatio.toFixed(2),
    profitFactor: +profitFactor.toFixed(2),
    avgWin:      +avgWin.toFixed(2),
    avgLoss:     +avgLoss.toFixed(2),
    bestTrade:   +Math.max(...trades.map(t => t.pnlPct)).toFixed(2),
    worstTrade:  +Math.min(...trades.map(t => t.pnlPct)).toFixed(2),
    equityCurve,
    trades,
  }
}
