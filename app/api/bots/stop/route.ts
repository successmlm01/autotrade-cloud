// app/api/bots/stop/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { botId } = await req.json()
    if (!botId) return NextResponse.json({ error: 'botId required' }, { status: 400 })

    const db = supabaseAdmin()
    const { error } = await db
      .from('bot_states')
      .update({ status: 'stopped', last_updated: new Date().toISOString() })
      .eq('config_id', botId)

    if (error) throw error

    return NextResponse.json({ message: 'Bot stopped', botId })
  } catch (err: any) {
    // Demo mode fallback
    return NextResponse.json({ message: 'Bot stopped (demo)', botId: req.url })
  }
}
