import {
  assessMarket,
  calculateOpportunity,
  parseItemName,
  roundMoney,
  scoreOpportunity,
  scoreLiquidity,
} from './calculations.js';
import {
  fetchCsfloatPrices,
  fetchDmarketOffers,
  fetchSkinportHistory,
  fetchSkinportItems,
  fetchSteamMarketItems,
} from './marketplaces.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const CACHE_MS = Number(process.env.MARKET_CACHE_SECONDS || 300) * 1000;
const cache = new Map();
const PERSISTENT_KEYS = new Set(['csfloat', 'skinport', 'skinport-history', 'dmarket', 'steam']);
const CACHE_DIR = path.resolve('.cache');

async function readPersistentCache(key) {
  if (!PERSISTENT_KEYS.has(key)) return null;
  try {
    const saved = JSON.parse(await fs.readFile(path.join(CACHE_DIR, `${key}.json`), 'utf8'));
    return Array.isArray(saved.data) && Number.isFinite(saved.at) ? saved : null;
  } catch {
    return null;
  }
}

function writePersistentCache(key, value) {
  if (!PERSISTENT_KEYS.has(key)) return;
  fs.mkdir(CACHE_DIR, { recursive: true })
    .then(() => fs.writeFile(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(value)))
    .catch(() => {});
}

async function cached(key, loader, ttl = CACHE_MS) {
  let existing = cache.get(key);
  if (!existing) {
    existing = await readPersistentCache(key);
    if (existing) cache.set(key, existing);
  }
  if (existing?.retryAt && Date.now() < existing.retryAt) return existing;
  if (existing?.data && Date.now() - existing.at < ttl) return existing;
  if (existing?.promise) return existing.promise;

  const promise = loader()
    .then((data) => {
      const value = { data, at: Date.now(), error: null };
      cache.set(key, value);
      writePersistentCache(key, value);
      return value;
    })
    .catch((error) => {
      const retryAt = error.retryAfterMs
        ? Date.now() + error.retryAfterMs
        : error.status === 401
          ? Date.now() + 24 * 60 * 60 * 1000
          : null;
      if (existing?.data) {
        const stale = { ...existing, error: error.message, retryAt };
        cache.set(key, stale);
        writePersistentCache(key, stale);
        return stale;
      }
      const failed = { data: [], at: Date.now(), error: error.message, retryAt };
      cache.set(key, failed);
      writePersistentCache(key, failed);
      return failed;
    });

  cache.set(key, { ...existing, promise });
  return promise;
}

function asMoneyFields(values) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      typeof value === 'number' ? roundMoney(value) : value,
    ]),
  );
}

function buildRow({ source, item, exit, history, settings }) {
  const calculation = calculateOpportunity({
    buyPrice: item.minPrice,
    exitFloor: exit.minPrice,
    exitMarket: settings.exitMarket,
    applyDeductions: settings.applyDeductions,
    saleFeePercent: settings.saleFeePercent,
    cashoutFeePercent: settings.cashoutFeePercent,
    riskBufferPercent: settings.riskBufferPercent,
    purchaseFeePercent: settings.purchaseFeePercent,
    steamWalletRatePercent: settings.steamWalletRatePercent,
  });
  const liquidity = scoreLiquidity({
    sourceQuantity: item.quantity,
    exitQuantity: exit.quantity,
    volume24h: history?.last24h?.volume,
    volume7d: history?.last7d?.volume,
  });
  const market = assessMarket({
    exitFloor: exit.minPrice,
    sourceQuantity: item.quantity,
    exitQuantity: exit.quantity,
    history,
    liquidityScore: liquidity.score,
  });
  const expectedCalculation = calculateOpportunity({
    buyPrice: item.minPrice,
    exitFloor: market.expectedSalePrice + 0.01,
    exitMarket: settings.exitMarket,
    applyDeductions: settings.applyDeductions,
    saleFeePercent: settings.saleFeePercent,
    cashoutFeePercent: settings.cashoutFeePercent,
    riskBufferPercent: settings.riskBufferPercent,
    purchaseFeePercent: settings.purchaseFeePercent,
    steamWalletRatePercent: settings.steamWalletRatePercent,
  });
  const opportunity = scoreOpportunity({
    expectedProfit: expectedCalculation.profit,
    expectedRoi: expectedCalculation.roi,
    liquidityScore: liquidity.score,
    market,
  });
  const parsed = parseItemName(item.marketHashName);

  return {
    id: `${source}:${item.offerId || item.marketHashName}`,
    marketHashName: item.marketHashName,
    ...parsed,
    source,
    sourceLabel: source === 'skinport' ? 'Skinport' : 'DMarket',
    buyUrl: item.url,
    exitMarket: settings.exitMarket,
    exitLabel: settings.exitMarket === 'steam' ? 'Steam Market' : 'CSFloat',
    exitUrl: settings.exitMarket === 'steam'
      ? exit.url
      : `https://csfloat.com/search?market_hash_name=${encodeURIComponent(item.marketHashName)}`,
    image: item.image || exit.image || null,
    buyPrice: roundMoney(item.minPrice),
    exitFloor: roundMoney(exit.minPrice),
    sourceQuantity: item.quantity,
    exitQuantity: exit.quantity,
    sourceMedian: Number.isFinite(item.medianPrice) ? item.medianPrice : null,
    saleMedian24h: history?.last24h?.median ?? null,
    saleMedian7d: history?.last7d?.median ?? null,
    saleVolume24h: history?.last24h?.volume ?? 0,
    saleVolume7d: history?.last7d?.volume ?? 0,
    liquidity,
    market,
    opportunity,
    expectedSalePrice: market.expectedSalePrice,
    expectedProfit: roundMoney(expectedCalculation.profit),
    expectedRoi: roundMoney(expectedCalculation.roi),
    ...asMoneyFields(calculation),
    roi: roundMoney(calculation.roi),
    profitable: calculation.profit > 0,
    updatedAt: item.updatedAt,
  };
}

export async function getOpportunityData(settings) {
  const dmarketPublicKey = process.env.DMARKET_PUBLIC_KEY?.trim();
  const dmarketSecretKey = process.env.DMARKET_SECRET_KEY?.trim();
  const [csfloat, skinport, history, dmarket, steam] = await Promise.all([
    cached('csfloat', fetchCsfloatPrices),
    cached('skinport', fetchSkinportItems),
    cached('skinport-history', fetchSkinportHistory),
    cached('dmarket', () =>
      fetchDmarketOffers({
        publicKey: dmarketPublicKey,
        secretKey: dmarketSecretKey,
        pagesPerRange: Number(process.env.DMARKET_PAGES_PER_RANGE || 3),
      }),
    ),
    cached(
      'steam',
      () => fetchSteamMarketItems({ pagesPerRange: Number(process.env.STEAM_PAGES_PER_RANGE || 5) }),
      15 * 60 * 1000,
    ),
  ]);

  const selectedExit = settings.exitMarket === 'steam' ? steam : csfloat;
  const exitMap = new Map(selectedExit.data.map((item) => [item.marketHashName, item]));
  const historyMap = new Map(history.data.map((item) => [item.marketHashName, item]));
  const sourceGroups = [
    ['skinport', skinport.data],
    ['dmarket', dmarket.data],
  ];
  const opportunities = [];

  for (const [source, items] of sourceGroups) {
    const cheapestByName = new Map();
    for (const item of items) {
      const existing = cheapestByName.get(item.marketHashName);
      if (!existing) {
        cheapestByName.set(item.marketHashName, { ...item });
      } else if (item.minPrice < existing.minPrice) {
        cheapestByName.set(item.marketHashName, {
          ...item,
          quantity: existing.quantity + item.quantity,
        });
      } else {
        existing.quantity += item.quantity;
      }
    }
    for (const item of cheapestByName.values()) {
      const exit = exitMap.get(item.marketHashName);
      if (!exit || !Number.isFinite(item.minPrice) || item.minPrice <= 0) continue;
      opportunities.push(
        buildRow({ source, item, exit, history: historyMap.get(item.marketHashName), settings }),
      );
    }
  }

  opportunities.sort((a, b) => b.opportunity.score - a.opportunity.score);

  // Keep the global best rows while guaranteeing the DMarket filter can inspect
  // every sampled match even when the source has fewer listings.
  const visibleRows = new Map(
    opportunities.slice(0, 4000).map((item) => [item.id, item]),
  );
  for (const item of opportunities.filter((entry) => entry.source === 'dmarket')) {
    visibleRows.set(item.id, item);
  }
  const returnedOpportunities = [...visibleRows.values()].sort((a, b) => b.opportunity.score - a.opportunity.score);
  const sourceMatches = Object.fromEntries(
    ['skinport', 'dmarket'].map((source) => [
      source,
      opportunities.filter((item) => item.source === source).length,
    ]),
  );
  const timestamps = [csfloat.at, skinport.at, history.at, dmarket.at, steam.at].filter(Boolean);
  return {
    opportunities: returnedOpportunities,
    meta: {
      generatedAt: new Date().toISOString(),
      oldestSourceAt: timestamps.length ? new Date(Math.min(...timestamps)).toISOString() : null,
      matchedItems: opportunities.length,
      profitableItems: opportunities.filter((item) => item.profitable).length,
      exitMarket: settings.exitMarket,
      exitLabel: settings.exitMarket === 'steam' ? 'Steam Market' : 'CSFloat',
      sourceMatches,
      settings,
      sources: [
        { id: 'csfloat', label: `CSFloat exit${settings.exitMarket === 'csfloat' ? ' (selected)' : ''}`, enabled: true, status: csfloat.error ? 'stale' : 'online', error: csfloat.error, records: csfloat.data.length, at: csfloat.at },
        { id: 'skinport', label: 'Skinport', enabled: true, status: skinport.error ? 'stale' : 'online', error: skinport.error, records: skinport.data.length, at: skinport.at },
        { id: 'skinport-history', label: 'Skinport sales', enabled: true, status: history.error ? 'stale' : 'online', error: history.error, records: history.data.length, at: history.at },
        { id: 'dmarket', label: 'DMarket', enabled: true, status: dmarket.error ? 'stale' : 'online', error: dmarket.error, records: dmarket.data.length, at: dmarket.at },
        { id: 'steam', label: `Steam exit${settings.exitMarket === 'steam' ? ' (selected)' : ''}`, enabled: true, status: steam.error ? 'stale' : 'online', error: steam.error, records: steam.data.length, at: steam.at },
      ],
    },
  };
}

export async function clearMarketCache() {
  for (const [key, value] of cache) {
    if (value.retryAt && Date.now() < value.retryAt) continue;
    cache.delete(key);
  }
  await Promise.all(
    [...PERSISTENT_KEYS].map((key) =>
      fs.unlink(path.join(CACHE_DIR, `${key}.json`)).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      }),
    ),
  );
}
