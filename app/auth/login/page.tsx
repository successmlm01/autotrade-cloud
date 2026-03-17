'use client'
// app/auth/login/page.tsx
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [mode, setMode]         = useState<'login' | 'signup'>('login')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error } =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password })
      if (error) throw error
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 24 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, background: 'linear-gradient(135deg,#22c55e,#16a34a)',
            borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, marginBottom: 12
          }}>A</div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>AutoTrade <span style={{ color: '#22c55e' }}>Cloud</span></h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Bot de trading automatisé</p>
        </div>

        <div style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 16, padding: 32 }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', background: '#0a0a0f', borderRadius: 8, padding: 4, marginBottom: 24 }}>
            {(['login', 'signup'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: mode === m ? '#1e1e2e' : 'transparent',
                color: mode === m ? '#f1f5f9' : '#6b7280',
                transition: 'all .15s',
              }}>
                {m === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="trader@example.com"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  background: '#0a0a0f', border: '1px solid #1e1e2e', color: '#f1f5f9',
                  fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>Mot de passe</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  background: '#0a0a0f', border: '1px solid #1e1e2e', color: '#f1f5f9',
                  fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            {error && (
              <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{
              background: '#22c55e', color: '#000', fontWeight: 700, fontSize: 14,
              border: 'none', borderRadius: 8, padding: '11px', cursor: 'pointer',
              opacity: loading ? .7 : 1, transition: 'opacity .15s',
            }}>
              {loading ? '…' : mode === 'login' ? 'Se connecter' : 'Créer un compte'}
            </button>
          </form>

          <p style={{ color: '#4b5563', fontSize: 12, textAlign: 'center', marginTop: 20, lineHeight: 1.5 }}>
            Mode demo disponible — pas de connexion requise en développement
          </p>
        </div>
      </div>
    </div>
  )
}
