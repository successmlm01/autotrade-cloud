# AutoTrade Cloud 🤖📈

Bot de trading crypto automatisé — SaaS full-stack sur **Next.js 14 + Supabase + Vercel**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/successmlm01/autotrade-cloud)

---

## ✨ Fonctionnalités

| Fonctionnalité | Détail |
|---|---|
| 🤖 **Bot de trading** | RSI+SMA, EMA Crossover, MACD+BB |
| 📊 **Dashboard** | Portfolio, courbe d'équité, signaux live |
| 🔄 **Backtesting** | Test sur 500 chandeliers, Sharpe/Drawdown |
| 🔔 **Webhook** | Intégration TradingView Pine Script |
| ⚡ **Realtime** | Supabase Realtime — mises à jour live |
| 🔐 **Auth** | Supabase Auth — email/password |
| 🚀 **CI/CD** | GitHub Actions → Vercel auto-deploy |

---

## 🚀 Déploiement rapide (15 min)

### 1. Cloner le projet

```bash
git clone https://github.com/successmlm01/autotrade-cloud.git
cd autotrade-cloud
npm install
```

### 2. Configurer Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans **SQL Editor** et coller le schéma depuis `lib/supabase.ts` (section commentée)
3. Récupérer les clés dans **Settings → API**

### 3. Variables d'environnement

```bash
cp .env.example .env.local
# Éditer .env.local avec vos clés Supabase + Binance
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
BINANCE_API_KEY=votre_clé
BINANCE_SECRET_KEY=votre_secret
WEBHOOK_SECRET=un_secret_aléatoire_fort
NEXT_PUBLIC_DEMO_MODE=true
```

### 4. Lancer en développement

```bash
npm run dev
# → http://localhost:3000/dashboard
```

### 5. Déployer sur Vercel

```bash
# Méthode 1: CLI Vercel
npm i -g vercel
vercel --prod

# Méthode 2: GitHub (recommandé)
# 1. Push sur GitHub
# 2. Importer le repo sur vercel.com
# 3. Ajouter les env vars dans Vercel Dashboard
# 4. Deploy automatique sur chaque push main
```

---

## 🛠 GitHub Actions — Secrets requis

Dans votre repo GitHub → **Settings → Secrets and variables → Actions** :

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Token API Vercel (vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | ID organisation Vercel (.vercel/project.json) |
| `VERCEL_PROJECT_ID` | ID projet Vercel (.vercel/project.json) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase |

---

## 💻 GitHub Codespaces

Développer directement dans le navigateur :

1. Ouvrir le repo sur GitHub
2. Cliquer **Code → Codespaces → Create codespace on main**
3. Attendre l'installation (1-2 min)
4. `npm run dev` → l'app s'ouvre automatiquement

Le fichier `.devcontainer/devcontainer.json` configure tout automatiquement (Node 20, extensions VS Code, port forwarding).

---

## 📁 Architecture

```
autotrade-cloud/
├── app/
│   ├── dashboard/           ← Dashboard principal
│   │   ├── page.tsx         ← Vue d'ensemble, bots, trades, signaux
│   │   ├── bots/new/        ← Création de bot
│   │   └── backtest/        ← Interface backtesting
│   ├── auth/login/          ← Authentification
│   └── api/
│       ├── bots/start/      ← POST: démarrer bot
│       ├── bots/stop/       ← POST: arrêter bot
│       ├── backtest/        ← POST: lancer backtest
│       ├── market/          ← GET: tickers live
│       ├── portfolio/       ← GET: données portefeuille
│       └── webhook/         ← POST: signaux externes (TradingView)
├── services/
│   ├── tradingBot.ts        ← Moteur: indicateurs + stratégies
│   └── backtest.ts          ← Moteur backtesting
├── hooks/
│   └── useRealtimeBotState.ts ← Supabase Realtime hook
├── lib/
│   └── supabase.ts          ← Client + schéma SQL
├── types/
│   └── index.ts             ← Types TypeScript
├── middleware.ts             ← Auth middleware Next.js
├── .devcontainer/           ← Config GitHub Codespaces
└── .github/workflows/       ← CI/CD GitHub Actions
```

---

## 🤖 Stratégies de trading

### RSI + SMA (par défaut)
- **BUY** : RSI < 30 (survente) + SMA20 > SMA50 (tendance haussière) + prix proche BB inférieure
- **SELL** : RSI > 70 (surachat) + SMA20 < SMA50 + prix proche BB supérieure

### EMA Crossover
- **BUY** : EMA12 > EMA26 + MACD histogram positif
- **SELL** : EMA12 < EMA26 + MACD histogram négatif

### Webhook (TradingView)
```
// Pine Script alert message:
{"secret":"{{WEBHOOK_SECRET}}","symbol":"{{ticker}}","side":"{{strategy.order.action}}","confidence":80}
// URL: https://votre-app.vercel.app/api/webhook
```

---

## 🔗 Connecter Binance (production)

```typescript
// services/tradingBot.ts — remplacer generateMockCandles() par :
import ccxt from 'ccxt'

const exchange = new ccxt.binance({
  apiKey:    process.env.BINANCE_API_KEY,
  secret:    process.env.BINANCE_SECRET_KEY,
})

const ohlcv  = await exchange.fetchOHLCV('BTC/USDT', '1h', undefined, 200)
const candles = ohlcv.map(([ts, o, h, l, c, v]) => ({ timestamp: ts, open: o, high: h, low: l, close: c, volume: v }))
```

---

## ⚠️ Avertissement

Ce logiciel est fourni à des fins éducatives. Le trading de crypto-monnaies comporte des risques importants. N'investissez jamais plus que ce que vous pouvez vous permettre de perdre. Testez toujours en mode démo avant d'utiliser de l'argent réel.

---

## 📄 Licence

MIT — © 2024 AutoTrade Cloud
