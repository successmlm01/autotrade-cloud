import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import { executeBotCycle } from './engine/tradingExecutor';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function workerLoop() {
  console.log("🤖 Worker actif - Scan des bots en cours...");

  while (true) {
    const { data: bots } = await supabase
      .from('bots')
      .select('*, profiles(api_key_binance, api_secret_binance)')
      .eq('status', 'running');

    if (bots) {
      for (const bot of bots) {
        await executeBotCycle(bot);
      }
    }

    // Attendre 30 secondes avant le prochain cycle
    await new Promise(r => setTimeout(r, 30000));
  }
}

workerLoop();
