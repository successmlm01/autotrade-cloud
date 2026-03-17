// hooks/useRealtimeBotState.ts
// Subscribe to live bot state updates via Supabase Realtime
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { BotState } from '@/types'

export function useRealtimeBotState(configId: string) {
  const [state, setState] = useState<Partial<BotState> | null>(null)

  useEffect(() => {
    if (!configId) return

    // Initial fetch
    supabase
      .from('bot_states')
      .select('*')
      .eq('config_id', configId)
      .single()
      .then(({ data }) => data && setState(data))

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`bot-state-${configId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bot_states', filter: `config_id=eq.${configId}` },
        ({ new: newRow }) => {
          setState(newRow as Partial<BotState>)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [configId])

  return state
}

// hooks/usePortfolio.ts
export function usePortfolioRefresh(intervalMs = 30000) {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      const res = await fetch('/api/portfolio')
      setData(await res.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return { data, loading, refresh }
}
