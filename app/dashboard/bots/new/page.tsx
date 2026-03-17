'use client'
// app/dashboard/bots/new/page.tsx — Création / édition d'un bot
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Exchange, TimeFrame } from '@/types'

const EXCHANGES: Exchange[]   = ['binance', 'coinbase', 'kraken', 'bybit']
const TIMEFRAMES: TimeFrame[] = ['1m','5m','15m','1h','4h','1d']
const PAIRS = ['BTC/USDT','ETH/USDT','BNB/USDT','SOL/USDT','ADA/USDT','DOGE/USDT','XRP/USDT','DOT/USDT']

interface FormData {
  name: string; symbol: string; exchange: Exchange; timeframe: TimeFrame
  strategyType: string; rsiOversold: number; rsiOverbought: number
  smaSlow: number; smaFast: number; riskPercent: number
  takeProfitPct: number; stopLossPct: number; maxPositions: number
}

const DEFAULTS: FormData = {
  name: '', symbol: 'BTC/USDT', exchange: 'binance', timeframe: '1h',
  strategyType: 'rsi_sma', rsiOversold: 30, rsiOverbought: 70,
  smaSlow: 50, smaFast: 20, riskPercent: 2, takeProfitPct: 3, stopLossPct: 1.5, maxPositions: 3,
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ color: '#4b5563', fontSize: 12, marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  background: '#0a0a0f', border: '1px solid #1e1e2e', color: '#f1f5f9',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
}

export default function NewBotPage() {
  const router = useRouter()
  const [form, setForm]     = useState<FormData>(DEFAULTS)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]   = useState(false)

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // In production: POST to /api/bots/create with form data + user auth
    await new Promise(r => setTimeout(r, 800))
    setSaved(true)
    setLoading(false)
    setTimeout(() => router.push('/dashboard'), 1200)
  }

  // Risk/reward preview
  const rr = (form.takeProfitPct / form.stopLossPct).toFixed(2)
  const expectedPnl = (form.riskPercent * parseFloat(rr)).toFixed(2)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', padding: 24 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button onClick={() => router.back()} style={{ ...inputStyle, width: 'auto', padding: '8px 14px', cursor: 'pointer' }}>← Retour</button>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Nouveau bot de trading</h1>
        </div>

        <form onSubmit={handleSave}>
          {/* ── Section 1: Identité ── */}
          <section style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#22c55e', marginBottom: 18, textTransform: 'uppercase', letterSpacing: '.06em' }}>01 — Identité</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Nom du bot">
                <input style={inputStyle} value={form.name} onChange={set('name')} placeholder="Mon bot BTC" required />
              </Field>
              <Field label="Exchange">
                <select style={inputStyle} value={form.exchange} onChange={set('exchange')}>
                  {EXCHANGES.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Paire de trading">
                <select style={inputStyle} value={form.symbol} onChange={set('symbol')}>
                  {PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Timeframe" hint="Intervalle d'analyse des chandeliers">
                <select style={inputStyle} value={form.timeframe} onChange={set('timeframe')}>
                  {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
          </section>

          {/* ── Section 2: Stratégie ── */}
          <section style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#22c55e', marginBottom: 18, textTransform: 'uppercase', letterSpacing: '.06em' }}>02 — Stratégie</h2>
            <Field label="Type de stratégie" hint="">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { id: 'rsi_sma',   label: 'RSI + SMA',    desc: 'Surachat/survente + croisement de moyennes' },
                  { id: 'ema_cross', label: 'EMA Crossover', desc: 'Croisement EMA12/EMA26 + MACD' },
                  { id: 'macd_bb',   label: 'MACD + BB',     desc: 'MACD divergence + Bollinger Bands' },
                  { id: 'custom',    label: 'Personnalisé',   desc: 'Configurer via webhook ou code' },
                ].map(s => (
                  <button
                    type="button" key={s.id}
                    onClick={() => setForm(prev => ({ ...prev, strategyType: s.id }))}
                    style={{
                      textAlign: 'left', padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                      border: form.strategyType === s.id ? '1px solid #22c55e' : '1px solid #1e1e2e',
                      background: form.strategyType === s.id ? 'rgba(34,197,94,.08)' : '#0a0a0f',
                      transition: 'all .15s',
                    }}
                  >
                    <p style={{ fontWeight: 600, fontSize: 13, color: form.strategyType === s.id ? '#22c55e' : '#f1f5f9' }}>{s.label}</p>
                    <p style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>{s.desc}</p>
                  </button>
                ))}
              </div>
            </Field>

            {form.strategyType === 'rsi_sma' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginTop: 16 }}>
                <Field label="RSI Survente" hint="< seuil = BUY">
                  <input type="number" style={inputStyle} value={form.rsiOversold} onChange={set('rsiOversold')} min={10} max={45} />
                </Field>
                <Field label="RSI Surachat" hint="> seuil = SELL">
                  <input type="number" style={inputStyle} value={form.rsiOverbought} onChange={set('rsiOverbought')} min={55} max={90} />
                </Field>
                <Field label="SMA rapide">
                  <input type="number" style={inputStyle} value={form.smaFast} onChange={set('smaFast')} min={5} max={50} />
                </Field>
                <Field label="SMA lente">
                  <input type="number" style={inputStyle} value={form.smaSlow} onChange={set('smaSlow')} min={20} max={200} />
                </Field>
              </div>
            )}
          </section>

          {/* ── Section 3: Gestion du risque ── */}
          <section style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#22c55e', marginBottom: 18, textTransform: 'uppercase', letterSpacing: '.06em' }}>03 — Gestion du risque</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
              <Field label="Risque / trade %" hint="% du capital risqué">
                <input type="number" style={inputStyle} value={form.riskPercent} onChange={set('riskPercent')} min={0.1} max={10} step={0.1} />
              </Field>
              <Field label="Take Profit %" hint="Objectif de gain">
                <input type="number" style={inputStyle} value={form.takeProfitPct} onChange={set('takeProfitPct')} min={0.5} max={20} step={0.1} />
              </Field>
              <Field label="Stop Loss %" hint="Seuil de perte max">
                <input type="number" style={inputStyle} value={form.stopLossPct} onChange={set('stopLossPct')} min={0.3} max={10} step={0.1} />
              </Field>
              <Field label="Max positions">
                <input type="number" style={inputStyle} value={form.maxPositions} onChange={set('maxPositions')} min={1} max={10} />
              </Field>
            </div>

            {/* Risk preview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
              {[
                { label: 'Ratio R/R',          value: `1 : ${rr}`,      color: parseFloat(rr) >= 2 ? '#22c55e' : '#f59e0b' },
                { label: 'PnL attendu (win)',   value: `+${expectedPnl}%`, color: '#22c55e' },
                { label: 'Perte max (loss)',    value: `-${form.riskPercent}%`,  color: '#f87171' },
              ].map(m => (
                <div key={m.label} style={{ background: '#0a0a0f', border: '1px solid #1e1e2e', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{m.label}</p>
                  <p style={{ fontWeight: 700, fontSize: 18, color: m.color }}>{m.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Submit */}
          <button type="submit" disabled={loading || saved} style={{
            width: '100%', padding: '13px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: saved ? '#16a34a' : '#22c55e', color: '#000', fontWeight: 700, fontSize: 15,
            opacity: loading ? .7 : 1, transition: 'all .2s',
          }}>
            {saved ? '✓ Bot sauvegardé !' : loading ? 'Sauvegarde…' : 'Créer le bot'}
          </button>
        </form>
      </div>
    </div>
  )
}
