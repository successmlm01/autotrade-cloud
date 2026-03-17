// ──────────────────────────────────────────────────────────────────
// AutoTrade Cloud – TypeScript Types
// ──────────────────────────────────────────────────────────────────

export type BotStatus = 'running' | 'stopped' | 'paused' | 'error'
export type OrderSide = 'BUY' | 'SELL'
export type SignalStrength = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL'
export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
export type Exchange = 'binance' | 'coinbase' | 'kraken' | 'bybit'

export interface BotConfig {
  id: string
  name: string
  symbol: string          // e.g. "BTC/USDT"
  exchange: Exchange
  timeframe: TimeFrame
  strategy: Strategy
  riskPercent: number     // % of capital per trade (e.g. 2)
  takeProfitPct: number   // % take profit
  stopLossPct: number     // % stop loss
  maxPositions: number
  enabled: boolean
}

export interface Strategy {
  type: 'rsi_sma' | 'macd_bb' | 'ema_cross' | 'custom'
  params: Record<string, number>
}

export interface BotState {
  id: string
  configId: string
  status: BotStatus
  capital: number
  openPositions: Position[]
  totalTrades: number
  winRate: number
  totalPnl: number
  lastSignal: TradingSignal | null
  lastUpdated: string
  errorMessage?: string
}

export interface Position {
  id: string
  symbol: string
  side: OrderSide
  entryPrice: number
  currentPrice: number
  quantity: number
  pnl: number
  pnlPct: number
  openedAt: string
}

export interface TradingSignal {
  symbol: string
  side: OrderSide
  strength: SignalStrength
  confidence: number       // 0–100
  price: number
  indicators: IndicatorSnapshot
  timestamp: string
  reason: string
}

export interface IndicatorSnapshot {
  rsi: number
  rsi14: number
  sma20: number
  sma50: number
  ema12: number
  ema26: number
  macd: number
  macdSignal: number
  macdHist: number
  bbUpper: number
  bbMiddle: number
  bbLower: number
  volume: number
  volumeMA: number
  atr: number
}

export interface Trade {
  id: string
  botId: string
  symbol: string
  side: OrderSide
  entryPrice: number
  exitPrice: number
  quantity: number
  pnl: number
  pnlPct: number
  fee: number
  openedAt: string
  closedAt: string
  strategy: string
  indicators: Partial<IndicatorSnapshot>
}

export interface Portfolio {
  totalValue: number
  totalPnl: number
  totalPnlPct: number
  dailyPnl: number
  weeklyPnl: number
  monthlyPnl: number
  allocations: AllocationItem[]
}

export interface AllocationItem {
  symbol: string
  value: number
  pct: number
  pnl: number
}

export interface MarketTicker {
  symbol: string
  price: number
  change24h: number
  volume24h: number
  high24h: number
  low24h: number
}

export interface CandleData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// ── Database row types (Supabase) ──────────────────────────────────

export interface BotConfigRow {
  id: string
  user_id: string
  name: string
  symbol: string
  exchange: Exchange
  timeframe: TimeFrame
  strategy_type: string
  strategy_params: Record<string, number>
  risk_percent: number
  take_profit_pct: number
  stop_loss_pct: number
  max_positions: number
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface TradeRow {
  id: string
  bot_id: string
  user_id: string
  symbol: string
  side: OrderSide
  entry_price: number
  exit_price: number
  quantity: number
  pnl: number
  pnl_pct: number
  fee: number
  opened_at: string
  closed_at: string
  strategy: string
  indicators: Partial<IndicatorSnapshot>
}
