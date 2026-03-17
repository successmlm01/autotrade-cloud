// ──────────────────────────────────────────────────────────────────
// lib/supabase.ts – Supabase client (browser + server)
// ──────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser-side client (singleton)
export const supabase = createClient(supabaseUrl, supabaseKey)

// Server-side client with service role (API routes only)
export const supabaseAdmin = () =>
  createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })

// ──────────────────────────────────────────────────────────────────
// SUPABASE SQL SCHEMA (run in Supabase SQL Editor)
// ──────────────────────────────────────────────────────────────────
/*
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Bot configurations
create table if not exists bot_configs (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references auth.users(id) on delete cascade,
  name             text not null,
  symbol           text not null default 'BTC/USDT',
  exchange         text not null default 'binance',
  timeframe        text not null default '1h',
  strategy_type    text not null default 'rsi_sma',
  strategy_params  jsonb not null default '{"rsiPeriod":14,"rsiOversold":30,"rsiOverbought":70,"smaSlow":50,"smaFast":20}',
  risk_percent     numeric(5,2) not null default 2,
  take_profit_pct  numeric(5,2) not null default 3,
  stop_loss_pct    numeric(5,2) not null default 1.5,
  max_positions    int not null default 3,
  enabled          boolean not null default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Bot run states
create table if not exists bot_states (
  id              uuid primary key default uuid_generate_v4(),
  config_id       uuid references bot_configs(id) on delete cascade unique,
  user_id         uuid references auth.users(id) on delete cascade,
  status          text not null default 'stopped',
  capital         numeric(18,8) not null default 0,
  total_trades    int not null default 0,
  win_rate        numeric(5,2) not null default 0,
  total_pnl       numeric(18,8) not null default 0,
  last_signal     jsonb,
  error_message   text,
  last_updated    timestamptz default now()
);

-- Trades history
create table if not exists trades (
  id           uuid primary key default uuid_generate_v4(),
  bot_id       uuid references bot_configs(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  symbol       text not null,
  side         text not null,
  entry_price  numeric(18,8) not null,
  exit_price   numeric(18,8),
  quantity     numeric(18,8) not null,
  pnl          numeric(18,8) default 0,
  pnl_pct      numeric(8,4) default 0,
  fee          numeric(18,8) default 0,
  opened_at    timestamptz default now(),
  closed_at    timestamptz,
  strategy     text,
  indicators   jsonb
);

-- Row level security
alter table bot_configs enable row level security;
alter table bot_states  enable row level security;
alter table trades      enable row level security;

create policy "Users own bots"   on bot_configs for all using (auth.uid() = user_id);
create policy "Users own states" on bot_states  for all using (auth.uid() = user_id);
create policy "Users own trades" on trades      for all using (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table bot_states;
alter publication supabase_realtime add table trades;
*/
