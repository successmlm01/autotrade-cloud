'use client'
// ──────────────────────────────────────────────────────────────────
// app/dashboard/page.tsx  –  AutoTrade Cloud Main Dashboard
// ──────────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { TradingSignal, MarketTicker } from '@/types'

// ── Types for UI ──────────────────────────────────────────────────
interface PortfolioData {
  totalValue: number; totalPnl: number; totalPnlPct: number
  dailyPnl: number; weeklyPnl: number; monthlyPnl: number
  allocations: { symbol: string; value: number; pct: number; pnl: number }[]
  equityCurve: { date: string; value: number }[]
}

interface BotCard {
  id: string; name: string; symbol: string; status: string
  pnl: number; winRate: number; totalTrades: number; signal: TradingSignal | null
}

// ── Helpers ───────────────────────────────────────────────────────
const fmt  = (n: number, d = 2) => n?.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })
const fmtP = (n: number)        => `${n >= 0 ? '+' : ''}${fmt(n)}%`
const fmtU = (n: number)        => `${n >= 0 ? '+' : ''}$${fmt(Math.abs(n))}`
const pnlCls = (n: number) => n >= 0 ? 'text-emerald-400' : 'text-red-400'

const MOCK_BOTS: BotCard[] = [
  { id: '1', name: 'BTC Alpha',   symbol: 'BTC/USDT', status: 'running', pnl: +840.20, winRate: 64, totalTrades: 47,  signal: null },
  { id: '2', name: 'ETH Scalper', symbol: 'ETH/USDT', status: 'running', pnl: +320.10, winRate: 58, totalTrades: 91,  signal: null },
  { id: '3', name: 'BNB Swing',   symbol: 'BNB/USDT', status: 'stopped', pnl: -42.00,  winRate: 45, totalTrades: 22,  signal: null },
  { id: '4', name: 'SOL Trend',   symbol: 'SOL/USDT', status: 'paused',  pnl: +156.80, winRate: 61, totalTrades: 33,  signal: null },
]

const MOCK_TRADES = [
  { id:'t1', symbol:'BTC/USDT', side:'BUY',  entryPrice:64200, exitPrice:65890, pnl:+420.50, pnlPct:+2.63, closedAt:'2024-01-15 14:22' },
  { id:'t2', symbol:'ETH/USDT', side:'SELL', entryPrice:3580,  exitPrice:3420,  pnl:+192.00, pnlPct:+4.47, closedAt:'2024-01-15 11:05' },
  { id:'t3', symbol:'BNB/USDT', side:'BUY',  entryPrice:580,   exitPrice:564,   pnl:-42.00,  pnlPct:-2.76, closedAt:'2024-01-14 22:18' },
  { id:'t4', symbol:'BTC/USDT', side:'BUY',  entryPrice:63100, exitPrice:65200, pnl:+620.10, pnlPct:+3.33, closedAt:'2024-01-14 09:44' },
  { id:'t5', symbol:'SOL/USDT', side:'BUY',  entryPrice:158,   exitPrice:167,   pnl:+156.80, pnlPct:+5.70, closedAt:'2024-01-13 18:30' },
]

// ── Custom chart tooltip ──────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card-sm" style={{ fontSize: 13, minWidth: 110 }}>
      <p style={{ color: '#6b7280', marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#22c55e', fontWeight: 600 }}>${fmt(payload[0].value, 0)}</p>
    </div>
  )
}

// ── Signal Badge ──────────────────────────────────────────────────
function SignalBadge({ signal }: { signal: TradingSignal | null }) {
  if (!signal) return <span className="badge-neutral">—</span>
  const isBuy = signal.side === 'BUY'
  return (
    <span className={isBuy ? 'badge-buy' : 'badge-sell'}>
      {signal.strength?.replace('_', ' ')} {signal.confidence}%
    </span>
  )
}

// ── Status Dot ────────────────────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const color =
    status === 'running' ? '#22c55e' :
    status === 'paused'  ? '#f59e0b' : '#6b7280'
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={status === 'running' ? 'pulse-dot' : ''} style={{
        width: 8, height: 8, borderRadius: '50%',
        background: color, display: 'inline-block'
      }}/>
      <span style={{ color, fontSize: 12, textTransform: 'capitalize' }}>{status}</span>
    </span>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────
function StatCard({ label, value, sub, valueClass = '' }: {
  label: string; value: string; sub?: string; valueClass?: string
}) {
  return (
    <div className="card" style={{ padding: '18px 22px' }}>
      <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 6, letterSpacing: '.04em', textTransform: 'uppercase' }}>{label}</p>
      <p className={`text-2xl font-bold ${valueClass}`} style={{ marginBottom: sub ? 4 : 0 }}>{value}</p>
      {sub && <p style={{ color: '#6b7280', fontSize: 12 }}>{sub}</p>}
    </div>
  )
}

// ── Ticker Bar ────────────────────────────────────────────────────
function TickerBar({ tickers }: { tickers: MarketTicker[] }) {
  return (
    <div style={{
      background: '#0d0d16', borderBottom: '1px solid #1e1e2e',
      padding: '8px 24px', display: 'flex', gap: 32, overflowX: 'auto',
    }}>
      {tickers.map(t => (
        <div key={t.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          <span style={{ color: '#9ca3af', fontSize: 12 }}>{t.symbol}</span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>${fmt(t.price)}</span>
          <span className={pnlCls(t.change24h)} style={{ fontSize: 12 }}>{fmtP(t.change24h)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────
export default function Dashboard() {
  const [portfolio, setPortfolio]   = useState<PortfolioData | null>(null)
  const [bots, setBots]             = useState<BotCard[]>(MOCK_BOTS)
  const [tickers, setTickers]       = useState<MarketTicker[]>([])
  const [activeTab, setActiveTab]   = useState<'overview' | 'bots' | 'trades' | 'signals'>('overview')
  const [loading, setLoading]       = useState(true)
  const [botLoading, setBotLoading] = useState<string | null>(null)

  // Fetch initial data
  useEffect(() => {
    Promise.all([
      fetch('/api/portfolio').then(r => r.json()),
      fetch('/api/market').then(r => r.json()),
    ]).then(([p, m]) => {
      setPortfolio(p)
      setTickers(m)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Refresh tickers every 10s
  useEffect(() => {
    const id = setInterval(() => {
      fetch('/api/market').then(r => r.json()).then(setTickers).catch(() => {})
    }, 10000)
    return () => clearInterval(id)
  }, [])

  const toggleBot = useCallback(async (bot: BotCard) => {
    setBotLoading(bot.id)
    try {
      const endpoint = bot.status === 'running' ? '/api/bots/stop' : '/api/bots/start'
      const res  = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ botId: bot.id }) })
      const data = await res.json()

      setBots(prev => prev.map(b => b.id !== bot.id ? b : {
        ...b,
        status: bot.status === 'running' ? 'stopped' : 'running',
        signal: data.signal ?? b.signal,
      }))
    } catch {}
    setBotLoading(null)
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '2px solid #1e1e2e', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
      <p style={{ color: '#6b7280' }}>Chargement AutoTrade Cloud…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  )

  const p = portfolio

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ── */}
      <header style={{
        background: '#0d0d16', borderBottom: '1px solid #1e1e2e',
        padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 28, height: 28, background: 'linear-gradient(135deg,#22c55e,#16a34a)',
            borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800
          }}>A</div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>AutoTrade <span style={{ color: '#22c55e' }}>Cloud</span></span>
        </div>
        <nav style={{ display: 'flex', gap: 4 }}>
          {(['overview','bots','trades','signals'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: activeTab === tab ? 'rgba(34,197,94,.15)' : 'transparent',
              color:      activeTab === tab ? '#22c55e' : '#9ca3af',
              transition: 'all .15s',
            }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="pulse-dot" style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }}/>
          <span style={{ color: '#22c55e', fontSize: 12 }}>Live</span>
        </div>
      </header>

      {/* ── Ticker Bar ── */}
      {tickers.length > 0 && <TickerBar tickers={tickers} />}

      {/* ── Content ── */}
      <main style={{ flex: 1, padding: '24px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && p && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Stats */}
            <div className="grid-stats">
              <StatCard label="Portefeuille total"   value={`$${fmt(p.totalValue)}`} sub={`${fmtP(p.totalPnlPct)} all time`} valueClass={pnlCls(p.totalPnl)} />
              <StatCard label="PnL du jour"          value={fmtU(p.dailyPnl)}        sub="dernières 24h"                    valueClass={pnlCls(p.dailyPnl)} />
              <StatCard label="PnL semaine"          value={fmtU(p.weeklyPnl)}       sub="7 derniers jours"                 valueClass={pnlCls(p.weeklyPnl)} />
              <StatCard label="Bots actifs"          value={`${bots.filter(b => b.status === 'running').length} / ${bots.length}`} sub="en cours d'exécution" />
            </div>

            {/* Equity Curve */}
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: '#f1f5f9' }}>Courbe de rendement — 30 jours</h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={p.equityCurve}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                  <XAxis dataKey="date" tick={{ fill:'#6b7280', fontSize:11 }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fill:'#6b7280', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
                  <Tooltip content={<ChartTooltip/>} />
                  <Area type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} fill="url(#grad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Allocations */}
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Allocations</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {p.allocations.map(a => (
                  <div key={a.symbol} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 90, fontSize: 13, fontWeight: 600 }}>{a.symbol}</span>
                    <div style={{ flex: 1, background: '#1e1e2e', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${a.pct}%`, height: '100%', background: '#22c55e', borderRadius: 4 }}/>
                    </div>
                    <span style={{ width: 50, fontSize: 12, color: '#9ca3af', textAlign: 'right' }}>{a.pct}%</span>
                    <span style={{ width: 80, fontSize: 13, textAlign: 'right' }}>${fmt(a.value, 0)}</span>
                    <span className={`${pnlCls(a.pnl)} text-sm`} style={{ width: 70, textAlign: 'right' }}>{fmtU(a.pnl)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Bots Tab ── */}
        {activeTab === 'bots' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {bots.map(bot => (
              <div key={bot.id} className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{bot.name}</h3>
                    <p style={{ color: '#6b7280', fontSize: 13 }}>{bot.symbol}</p>
                  </div>
                  <StatusDot status={bot.status} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>PnL</p>
                    <p className={`font-bold ${pnlCls(bot.pnl)}`}>{fmtU(bot.pnl)}</p>
                  </div>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>Win Rate</p>
                    <p className="font-bold">{bot.winRate}%</p>
                  </div>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>Trades</p>
                    <p className="font-bold">{bot.totalTrades}</p>
                  </div>
                </div>

                {bot.signal && (
                  <div style={{ background: '#0d0d16', border: '1px solid #1e1e2e', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <SignalBadge signal={bot.signal} />
                      <span style={{ color: '#6b7280' }}>${fmt(bot.signal.price)}</span>
                    </div>
                    <p style={{ color: '#9ca3af', lineHeight: 1.4 }}>{bot.signal.reason}</p>
                    {bot.signal.indicators && (
                      <div style={{ display: 'flex', gap: 12, marginTop: 8, color: '#6b7280' }}>
                        <span>RSI {bot.signal.indicators.rsi?.toFixed(1)}</span>
                        <span>MACD {bot.signal.indicators.macd?.toFixed(0)}</span>
                        <span>ATR {bot.signal.indicators.atr?.toFixed(0)}</span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => toggleBot(bot)}
                  disabled={botLoading === bot.id}
                  style={{
                    width: '100%', padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: 13, transition: 'all .15s',
                    background: bot.status === 'running'
                      ? 'rgba(239,68,68,.15)' : 'rgba(34,197,94,.15)',
                    color: bot.status === 'running' ? '#f87171' : '#4ade80',
                    opacity: botLoading === bot.id ? .6 : 1,
                  }}
                >
                  {botLoading === bot.id ? '…' : bot.status === 'running' ? '⏹ Arrêter le bot' : '▶ Démarrer le bot'}
                </button>
              </div>
            ))}

            {/* Add bot CTA */}
            <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 220, cursor: 'pointer', border: '1px dashed #2d2d3d' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(34,197,94,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 12 }}>+</div>
              <p style={{ fontWeight: 600 }}>Nouveau bot</p>
              <p style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', marginTop: 6 }}>Configurer une nouvelle stratégie</p>
            </div>
          </div>
        )}

        {/* ── Trades Tab ── */}
        {activeTab === 'trades' && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e1e2e' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Historique des trades</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e1e2e' }}>
                    {['Symbole','Direction','Entrée','Sortie','PnL','%','Date'].map(h => (
                      <th key={h} style={{ padding: '12px 20px', textAlign: 'left', color: '#6b7280', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_TRADES.map((t, i) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #111118', background: i % 2 === 0 ? 'transparent' : '#0d0d16' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600 }}>{t.symbol}</td>
                      <td style={{ padding: '14px 20px' }}><span className={t.side === 'BUY' ? 'badge-buy' : 'badge-sell'}>{t.side}</span></td>
                      <td style={{ padding: '14px 20px' }}>${fmt(t.entryPrice)}</td>
                      <td style={{ padding: '14px 20px' }}>${fmt(t.exitPrice)}</td>
                      <td className={`${pnlCls(t.pnl)} font-semibold`} style={{ padding: '14px 20px' }}>{fmtU(t.pnl)}</td>
                      <td className={pnlCls(t.pnlPct)} style={{ padding: '14px 20px' }}>{fmtP(t.pnlPct)}</td>
                      <td style={{ padding: '14px 20px', color: '#6b7280' }}>{t.closedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Signals Tab ── */}
        {activeTab === 'signals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Signaux en temps réel</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  { symbol: 'BTC/USDT', side: 'BUY',  conf: 82, reason: 'RSI(28.4) oversold + SMA cross + BB lower',  rsi: 28.4, macd: 820,  atr: 850 },
                  { symbol: 'ETH/USDT', side: 'SELL', conf: 71, reason: 'RSI(72.1) overbought + EMA bearish cross',     rsi: 72.1, macd: -340, atr: 62 },
                  { symbol: 'SOL/USDT', side: 'BUY',  conf: 65, reason: 'EMA12 > EMA26 + MACD bullish crossover',      rsi: 44.2, macd: 2.1,  atr: 4.2 },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#0d0d16', border: '1px solid #1e1e2e', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 100 }}>
                      <p style={{ fontWeight: 700, fontSize: 15 }}>{s.symbol}</p>
                      <SignalBadge signal={{ side: s.side as any, strength: s.conf >= 80 ? `STRONG_${s.side}` as any : s.side as any, confidence: s.conf } as any} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: '#9ca3af', fontSize: 13 }}>{s.reason}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280' }}>
                      <div><span style={{ color: '#9ca3af' }}>RSI </span><strong style={{ color: '#f1f5f9' }}>{s.rsi}</strong></div>
                      <div><span style={{ color: '#9ca3af' }}>MACD </span><strong className={pnlCls(s.macd)}>{s.macd}</strong></div>
                      <div><span style={{ color: '#9ca3af' }}>ATR </span><strong style={{ color: '#f1f5f9' }}>{s.atr}</strong></div>
                    </div>
                    <div style={{ background: 'rgba(34,197,94,.1)', color: '#22c55e', fontWeight: 700, fontSize: 16, padding: '8px 16px', borderRadius: 8 }}>
                      {s.conf}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Indicator Legend */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: '#9ca3af' }}>Indicateurs utilisés</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 12, fontSize: 13 }}>
                {[
                  { name: 'RSI (14)',       desc: 'Relative Strength Index — surachat/survente',       color: '#a78bfa' },
                  { name: 'SMA 20 / 50',    desc: 'Moving average crossover — tendance court/long',   color: '#60a5fa' },
                  { name: 'EMA 12 / 26',    desc: 'Exponential MA — plus réactif aux prix récents',   color: '#34d399' },
                  { name: 'MACD',           desc: 'Momentum + divergence entre EMA',                  color: '#f59e0b' },
                  { name: 'Bollinger Bands','desc': 'Volatilité + niveaux de support/résistance',      color: '#f87171' },
                  { name: 'ATR (14)',        desc: 'Average True Range — mesure de la volatilité',     color: '#fb923c' },
                ].map(ind => (
                  <div key={ind.name} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 4, height: 36, background: ind.color, borderRadius: 2, flexShrink: 0, marginTop: 2 }}/>
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: 2 }}>{ind.name}</p>
                      <p style={{ color: '#6b7280', fontSize: 12 }}>{ind.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid #1e1e2e', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#4b5563' }}>
        <span>AutoTrade Cloud v2.0 — Next.js + Supabase + Vercel</span>
        <span>⚠️ Demo mode — Connectez vos clés API en production</span>
      </footer>
    </div>
  )
}
