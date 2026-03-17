import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function Dashboard() {
  const [bots, setBots] = useState([]);

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    const { data } = await supabase.from('bots').select('*');
    setBots(data || []);
  };

  return (
    <div className="min-h-screen bg-black text-white p-10">
      <h1 className="text-3xl font-bold mb-8">AutoTrade Cloud</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bots.map((bot: any) => (
          <div key={bot.id} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
            <h2 className="text-xl font-semibold">{bot.name}</h2>
            <p className="text-gray-400 mb-4">{bot.symbol} - {bot.strategy}</p>
            <div className="flex justify-between items-center">
              <span className={bot.status === 'running' ? 'text-green-500' : 'text-red-500'}>
                ● {bot.status}
              </span>
              <button className="bg-blue-600 px-4 py-2 rounded-lg">Configurer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
