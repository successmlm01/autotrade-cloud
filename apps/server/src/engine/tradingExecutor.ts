import ccxt from 'ccxt';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const executeBotCycle = async (bot: any) => {
  try {
    // 1. Initialisation de l'échange (Ex: Binance)
    const exchange = new ccxt.binance({
      apiKey: bot.profiles.api_key_binance, // En prod, déchiffrer ici
      secret: bot.profiles.api_secret_binance,
    });

    // 2. Récupération du prix actuel
    const ticker = await exchange.fetchTicker(bot.symbol);
    const price = ticker.last;

    console.log(`[${bot.name}] Prix ${bot.symbol}: ${price}`);

    // 3. Logique de stratégie simple (Exemple: Achat si prix < cible)
    // C'est ici que tu placeras tes algos RSI, MACD, etc.
    const threshold = bot.settings.buy_threshold;
    
    if (price < threshold && bot.status === 'running') {
      console.log("Condition d'achat remplie !");
      // await exchange.createMarketOrder(bot.symbol, 'buy', bot.settings.amount);
      
      // Enregistrer le trade en DB
      await supabase.from('trades').insert({
        bot_id: bot.id,
        symbol: bot.symbol,
        side: 'buy',
        price: price,
        amount: bot.settings.amount
      });
    }
  } catch (e: any) {
    console.error(`Erreur bot ${bot.name}:`, e.message);
  }
};
