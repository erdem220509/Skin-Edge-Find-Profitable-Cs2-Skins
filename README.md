# Skin Edge

Skin Edge is a real-time CS2 market opportunity engine. It compares purchase listings with resale prices, completed-sale evidence, liquidity, price stability and sales velocity, then ranks exact item matches by expected return and confidence.

The dashboard is a research tool. Every result links to its purchase page and selected resale market so the listing, float, stickers, and current price can be verified before buying.

## Features

- Compare Skinport and DMarket purchases with CSFloat or Steam exits.
- Switch between **Gross spread** and **After deductions** calculations.
- Rank results by a transparent **Opportunity Score** and confidence estimate.
- Compare expected profit and ROI with optimistic current-floor economics.
- Sort by Opportunity Score, confidence, expected economics, live-floor economics, or liquidity.
- Reverse every sorting mode.
- Filter by buy market, liquidity, profitability, or item name.
- Review listing depth and recent Skinport sales activity.
- Open purchase and resale pages directly from the item inspector.
- Cache marketplace responses and respect provider rate limits.
- Keep API credentials on the local Node.js server.

## Supported markets

| Marketplace | Role | Authentication |
| --- | --- | --- |
| [Skinport](https://skinport.com/market) | Purchase prices and sales history | Not required |
| [DMarket](https://dmarket.com/ingame-items/item-list/csgo-skins) | Purchase listings | No credentials; Trading API keys are an optional fallback |
| [CSFloat](https://csfloat.com/search) | Resale prices | Not required |
| [Steam Community Market](https://steamcommunity.com/market/search?appid=730) | Sampled resale prices | Not required |

Marketplace coverage is not guaranteed to include every listing. Steam and DMarket results are sampled across several price ranges and their configured page limits.

## Profit calculations

### Expected sale value

The current resale floor is not treated as guaranteed. Skin Edge caps the floor with the most recent available 7-, 30-, or 90-day completed-sale median (plus a small 3% allowance). If no completed-sale median exists, the current floor receives a conservative 15% haircut.

This is a transparent heuristic, not a future-price prediction. It becomes a genuine prediction system only after first-party time-series snapshots and a validated forecasting model are added.

## Opportunity Score

Every exact-name match receives a score from 0 to 100:

| Signal | Weight | Meaning |
| --- | ---: | --- |
| Expected net ROI | 25% | Return at the reliability-adjusted sale value |
| Expected profit | 15% | Absolute expected dollar profit |
| Liquidity | 15% | Source depth, exit depth, and recent volume |
| Price stability | 10% | Dispersion across recent ranges and medians |
| Sales velocity | 15% | Weighted daily sales from 24h, 7d, and 30d windows |
| Spread reliability | 15% | Floor-to-median alignment, depth, and history coverage |
| Market safety | 5% | Inverse of estimated volatility, illiquidity, and weak evidence |

Confidence is reported separately and uses only market-evidence signals: liquidity, stability, velocity, and spread reliability. The score is intentionally inspectable in the item panel.

### Gross spread

Gross spread is the default. It compares the planned resale price with the purchase price without applying fees, cash-out costs, Wallet valuation, or risk reserve.

```text
gross spread = planned resale price - purchase price
```

### After deductions

This mode applies every enabled assumption before ranking results.

CSFloat deductions can include:

- Purchase or payment fee
- CSFloat sale fee
- Optional cash-out fee
- Risk reserve

Steam deductions can include:

- Purchase or payment fee
- Steam's 5% transaction fee
- CS2's 10% game fee
- Steam minimum-cent fee rounding
- Steam Wallet cash-value adjustment
- Risk reserve

Steam sale proceeds remain in Steam Wallet and cannot be withdrawn as cash. The Wallet-value setting controls how much one Wallet dollar is worth in the comparison.

## Requirements

- [Node.js](https://nodejs.org/) `20.19.0` or newer
- npm
- Internet access for marketplace data

No database is required. Market snapshots are stored in the local `.cache` directory.

## Installation

```bash
git clone <repository-url>
cd skin_price_catcher
npm install
```

Skinport, CSFloat, Steam, and DMarket purchase listings work without credentials.

To change the DMarket sampling limit or configure signed API fallback credentials, create a local environment file:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Trading API keys are optional. When supplied, they are only used if DMarket's read-only website feed is unavailable:

```dotenv
DMARKET_PUBLIC_KEY=your_dmarket_public_key
DMARKET_SECRET_KEY=your_dmarket_secret_key
```

Never commit `.env` or publish marketplace credentials.

## Running the app

Development mode starts the API and Vite server together:

```bash
npm run dev
```

Open `http://127.0.0.1:5173`. The API runs at `http://127.0.0.1:8787`.

For a production-style local build:

```bash
npm run build
npm start
```

Then open `http://127.0.0.1:8787`.

## Configuration

| Variable | Default | Purpose |
| --- | ---: | --- |
| `DMARKET_PUBLIC_KEY` | Empty | Optional DMarket Trading API fallback public key |
| `DMARKET_SECRET_KEY` | Empty | Optional DMarket Trading API fallback secret key |
| `DMARKET_PAGES_PER_RANGE` | `3` | DMarket pages sampled per price range |
| `STEAM_PAGES_PER_RANGE` | `5` | Steam pages sampled per price range |
| `MARKET_CACHE_SECONDS` | `300` | Default marketplace cache duration |
| `PORT` | `8787` | Production server port |

## Data freshness and errors

Marketplace responses are cached instead of requested for every filter or assumption change. Skinport snapshots persist across server restarts.

When Skinport returns HTTP `429`, Skin Edge follows its `Retry-After` value. Manual refresh cannot bypass an active cooldown. Provider state and record counts are shown under **Assumptions -> Data sources**.

DMarket listings normally use its read-only website feed. If that feed is unavailable, configured Trading API keys are attempted as a fallback. A fallback `401` means the keys are expired, revoked, or otherwise rejected by DMarket.

## Accuracy and risk

Skin Edge cannot guarantee profit. Results use current listing data, not completed sales.

Before buying, verify:

- The listing still exists at the displayed price.
- Market name, exterior, StatTrak status, and Souvenir status match.
- Float, paint seed, phase, stickers, and charms do not change the valuation.
- The item can be transferred and listed when expected.
- Marketplace fees and withdrawal rules have not changed.
- Listing depth and sales activity are sufficient for the trade.

CS2 items may be subject to Steam trade restrictions, and prices can move during the holding period. Rare and low-liquidity items require additional manual valuation.

## Security

- Marketplace secrets are read only by the Node.js server.
- DMarket keys are never returned to the frontend.
- `.env`, caches, logs, screenshots, Playwright sessions, build output, and editor metadata are ignored by Git.
- `.env.example` contains placeholders only.

If a key has ever been committed or published, revoke it, generate a replacement, and remove it from repository history before sharing the project.

## Tests

```bash
npm test
npm run build
```

Tests cover deductions, Steam fee rounding, Wallet valuation, gross spread, item parsing, liquidity, market assessment, and opportunity scoring.

## Frontend structure

```text
src/
  components/
    AssumptionsPanel.jsx
    Filters.jsx
    MarketStatus.jsx
    OpportunityCard.jsx
    OpportunityTable.jsx
  config/
    opportunities.js
  hooks/
    useOpportunities.js
  utils/
    formatting.js
  App.jsx
```

## License

[MIT](LICENSE)

## Disclaimer

This independent project is not affiliated with Valve, Steam, Skinport, DMarket, or CSFloat. Users are responsible for marketplace terms, account restrictions, local laws, and tax obligations.
