'use client'
// app/dashboard/backtest/page.tsx
import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'

interface BacktestResult {
  totalTrades: number; winRate: number; totalPnl: number; totalPnlPct: number
  maxDrawdown: number; sharpeRatio: number; profitFactor: number
  avgWin: number; avgLoss: number; bestTrade: number; worstTrade: number
  equityCurve: { i: number; equity: number; date: string }[]
}

const fmt  = (n: number, d = 2) => n?.toFixed ? n.toFixed(d) : n
const fmtP = (n: number)        => `${n >= 0 ? '+' : ''}${fmt(n)}%`
const pnlCls = (n: number)      => n >= 0 ? '#22c55e' : '#ef4444'

export default function BacktestPage() {
  const [symbol,    setSymbol]    = useState('BTC/USDT')
  const [strategy,  setStrategy]  = useState('rsi_sma')
  const [capital,   setCapital]   = useState(1000)
  const [tp,        setTp]        = useState(3)
  const [sl,        setSl]        = useState(1.5)
  const [rsi_os,    setRsiOs]     = useState(30)
  const [rsi_ob,    setRsiOb]     = useState(70)
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState<BacktestResult | null>(null)
  const [error,     setError]     = useState('')

  async function runTest() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol, strategyType: strategy, initialCapital: capital,
          takeProfitPct: tp, stopLossPct: sl, candleCount: 500,
          params: { rsiOversold: rsi_os, rsiOverbought: rsi_ob, smaFast: 20, smaSlow: 50 }
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Backtesting</h1>
        <p style={{ color: '#6b7280', marginBottom: 28, fontSize: 14 }}>Testez vos stratégies sur données historiques simulées</p>

        {/* Config panel */}
        <div style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            {[
              { label: 'Paire', el: <select value={symbol} onChange={e => setSymbol(e.target.value)} style={sel}>
                  {['BTC/USDT','ETH/USDT','BNB/USDT','SOL/USDT'].map(s => <option key={s}>{s}</option>)}
                </select>},
              { label: 'Stratégie', el: <select value={strategy} onChange={e => setStrategy(e.target.value)} style={sel}>
                  <option value="rsi_sma">RSI + SMA</option>
                  <option value="ema_cross">EMA Cross</option>
                </select>},
              { label: 'Capital ($)', el: <input type="number" value={capital} onChange={e => setCapital(+e.target.value)} style={inp} min={100} /> },
              { label: 'Take Profit %', el: <input type="number" value={tp} onChange={e => setTp(+e.target.value)} style={inp} step={0.5} min={0.5} /> },
              { label: 'Stop Loss %',   el: <input type="number" value={sl} onChange={e => setSl(+e.target.value)} style={inp} step={0.5} min={0.3} /> },
              { label: 'RSI Survente',  el: <input type="number" value={rsi_os} onChange={e => setRsiOs(+e.target.value)} style={inp} min={10} max={45} /> },
            ].map(({ label, el }) => (
              <div key={label}>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: 12, marginBottom: 6 }}>{label}</label>
                {el}
              </div>
            ))}
          </div>
          <button onClick={runTest} disabled={loading} style={{
            marginTop: 20, padding: '10px 28px', borderRadius: 8, border: 'none',
            background: '#22c55e', color: '#000', fontWeight: 700, cursor: 'pointer',
            opacity: loading ? .7 : 1, fontSize: 14,
          }}>
            {loading ? '⏳ Analyse en cours…' : '▶ Lancer le backtest'}
          </button>
          {error && <p style={{ color: '#f87171', marginTop: 10, fontSize: 13 }}>{error}</p>}
        </div>

        {/* Results */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
              {[
                { label: 'PnL Total',       val: fmtP(result.totalPnlPct), color: pnlCls(result.totalPnlPct) },
                { label: 'Win Rate',        val: `${fmt(result.winRate)}%`, color: result.winRate >= 50 ? '#22c55e' : '#f87171' },
                { label: 'Trades',          val: result.totalTrades,        color: '#f1f5f9' },
                { label: 'Sharpe Ratio',    val: fmt(result.sharpeRatio),   color: result.sharpeRatio >= 1 ? '#22c55e' : '#f59e0b' },
                { label: 'Profit Factor',   val: fmt(result.profitFactor),  color: result.profitFactor >= 1.5 ? '#22c55e' : '#f87171' },
                { label: 'Max Drawdown',    val: `${fmt(result.maxDrawdown)}%`, color: '#f87171' },
                { label: 'Meilleur trade',  val: fmtP(result.bestTrade),    color: '#22c55e' },
                { label: 'Pire trade',      val: fmtP(result.worstTrade),   color: '#f87171' },
              ].map(m => (
                <div key={m.label} style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 10, padding: '16px 18px' }}>
                  <p style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{m.label}</p>
                  <p style={{ fontWeight: 700, fontSize: 20, color: m.color as string }}>{m.val}</p>
                </div>
              ))}
            </div>

            {/* Equity curve */}
            {result.equityCurve.length > 1 && (
              <div style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 12, padding: 24 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>Courbe d'équité</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={result.equityCurve}>
                    <defs>
                      <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                    <XAxis dataKey="date" tick={{ fill:'#6b7280', fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:'#6b7280', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`}/>
                    <ReferenceLine y={capital} stroke="#1e1e2e" strokeDasharray="4 4" />
                    <Tooltip formatter={(v: any) => [`$${v}`, 'Équité']} contentStyle={{ background:'#111118', border:'1px solid #1e1e2e', borderRadius:8, fontSize:12 }} />
                    <Area type="monotone" dataKey="equity" stroke="#22c55e" strokeWidth={2} fill="url(#bg2)" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {result.totalTrades === 0 && (
              <div style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 12, padding: 32, textAlign: 'center', color: '#6b7280' }}>
                Aucun signal déclenché avec ces paramètres. Essayez d'assouplir les seuils RSI.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:8, background:'#0a0a0f', border:'1px solid #1e1e2e', color:'#f1f5f9', fontSize:13, outline:'none', boxSizing:'border-box' }
const sel: React.CSSProperties = { ...inp }
