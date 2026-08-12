import nacl from 'tweetnacl';

const DEFAULT_TIMEOUT = 30_000;

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? DEFAULT_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'br, gzip, deflate',
        'User-Agent': 'SkinEdge/0.1 opportunity research tool',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = new Error(`${response.status} ${response.statusText}`);
      error.status = response.status;
      const retryAfter = Number(response.headers.get('retry-after'));
      if (response.status === 429 && Number.isFinite(retryAfter)) {
        error.retryAfterMs = Math.max(1, retryAfter) * 1000;
        error.message = `Rate limited; retry available in ${Math.ceil(retryAfter / 60)}m`;
      }
      throw error;
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchCsfloatPrices() {
  const data = await fetchJson('https://csfloat.com/api/v1/listings/price-list');
  return data.map((item) => ({
    marketHashName: item.market_hash_name,
    minPrice: Number(item.min_price) / 100,
    quantity: Number(item.quantity) || 0,
  }));
}

export async function fetchSkinportItems() {
  const data = await fetchJson(
    'https://api.skinport.com/v1/items?app_id=730&currency=USD&tradable=true',
    { headers: { 'Accept-Encoding': 'br' } },
  );

  return data.map((item) => ({
    marketHashName: item.market_hash_name,
    minPrice: Number(item.min_price),
    suggestedPrice: Number(item.suggested_price),
    meanPrice: Number(item.mean_price),
    medianPrice: Number(item.median_price),
    quantity: Number(item.quantity) || 0,
    url: item.item_page,
    updatedAt: item.updated_at ? new Date(item.updated_at * 1000).toISOString() : null,
  }));
}

export async function fetchSkinportHistory() {
  const data = await fetchJson(
    'https://api.skinport.com/v1/sales/history?app_id=730&currency=USD',
    { headers: { 'Accept-Encoding': 'br' } },
  );

  return data.map((item) => ({
    marketHashName: item.market_hash_name,
    last24h: item.last_24_hours,
    last7d: item.last_7_days,
    last30d: item.last_30_days,
    last90d: item.last_90_days,
  }));
}

export async function fetchSteamMarketItems({ pagesPerRange = 5 }) {
  const ranges = [
    [0, 99],
    [100, 999],
    [1_000, 9_999],
    [10_000, 99_999],
    [100_000, 10_000_000],
  ];
  const all = [];

  for (const [priceMin, priceMax] of ranges) {
    for (let page = 0; page < pagesPerRange; page += 1) {
      const params = new URLSearchParams({
        appid: '730',
        norender: '1',
        start: String(page * 100),
        count: '100',
        sort_column: 'price',
        sort_dir: 'asc',
        price_min: String(priceMin),
        price_max: String(priceMax),
      });
      const data = await fetchJson(`https://steamcommunity.com/market/search/render/?${params}`);
      const results = data.results || [];
      all.push(...results);
      if (results.length === 0) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  const normalized = all.map((item) => {
    const marketHashName = item.hash_name || item.asset_description?.market_hash_name;
    const icon = item.asset_description?.icon_url_large || item.asset_description?.icon_url;
    return {
      marketHashName,
      minPrice: Number(item.sell_price) / 100,
      quantity: Number(item.sell_listings) || 0,
      image: icon
        ? `https://community.cloudflare.steamstatic.com/economy/image/${icon}/240fx160f`
        : null,
      url: marketHashName
        ? `https://steamcommunity.com/market/listings/730/${encodeURIComponent(marketHashName)}`
        : null,
    };
  }).filter((item) => item.marketHashName && item.minPrice > 0);

  return [...new Map(normalized.map((item) => [item.marketHashName, item])).values()];
}

function signDmarketRequest(pathWithQuery, timestamp, secretKey) {
  const keyBytes = Buffer.from(secretKey, 'hex');
  const keyPair = keyBytes.length === 32 ? nacl.sign.keyPair.fromSeed(keyBytes) : { secretKey: keyBytes };
  const signature = nacl.sign.detached(
    Buffer.from(`GET${pathWithQuery}${timestamp}`),
    keyPair.secretKey,
  );
  return `dmar ed25519 ${Buffer.from(signature).toString('hex')}`;
}

export function normalizeDmarketOffers(offers) {
  const normalized = offers.map((offer) => {
    const title = offer.title || offer.asset?.title || offer.attributes?.title;
    const priceCents = offer.price?.amount ?? offer.priceCents ?? offer.price;
    return {
      marketHashName: title,
      minPrice: Number(priceCents) / 100,
      quantity: 1,
      image:
        offer.image ||
        offer.attributes?.imageUri ||
        offer.attributes?.image ||
        offer.asset?.imageUri ||
        offer.asset?.image,
      offerId: offer.offerId || offer.id,
      url: offer.offerId
        ? `https://dmarket.com/ingame-items/item-list/csgo-skins?userOfferId=${offer.offerId}`
        : `https://dmarket.com/ingame-items/item-list/csgo-skins?title=${encodeURIComponent(title || '')}`,
    };
  }).filter((item) => item.marketHashName && Number.isFinite(item.minPrice));

  return [...new Map(normalized.map((item) => [item.offerId || `${item.marketHashName}:${item.minPrice}`, item])).values()];
}

async function fetchDmarketWebsiteOffers({ pagesPerRange }) {
  const all = [];
  const ranges = [
    [0, 99],
    [100, 999],
    [1_000, 9_999],
    [10_000, 99_999],
    [100_000, 10_000_000],
  ];
  let requestCount = 0;

  for (const [priceFrom, priceTo] of ranges) {
    let pageToken = '';
    for (let page = 0; page < pagesPerRange; page += 1) {
      const params = new URLSearchParams({
        side: 'dmarketOffers',
        currency: 'USD',
        platform: 'browser',
        gameId: 'a8db',
        pageSize: '100',
        isLoggedIn: 'false',
        priceFrom: String(priceFrom),
        priceTo: String(priceTo),
        orderBy: 'price',
        orderDir: 'asc',
      });
      if (pageToken) params.set('pageToken', pageToken);

      // DMarket limits unauthenticated market-item requests to 2 per second.
      if (requestCount > 0) await new Promise((resolve) => setTimeout(resolve, 550));
      requestCount += 1;

      const data = await fetchJson(
        `https://api.dmarket.com/exchange/v1/market/items/v2?${params}`,
      );

      const offers = data.offers || [];
      all.push(...offers);
      pageToken = data.pageToken || '';
      if (!pageToken || offers.length === 0) break;
    }
  }

  return normalizeDmarketOffers(all);
}

async function fetchDmarketTradingOffers({ publicKey, secretKey, pagesPerRange }) {
  if (!publicKey || !secretKey) return [];

  const all = [];
  const ranges = [
    [0, 99],
    [100, 999],
    [1_000, 9_999],
    [10_000, 99_999],
    [100_000, 10_000_000],
  ];

  for (const [priceFrom, priceTo] of ranges) {
    let cursor = '';
    for (let page = 0; page < pagesPerRange; page += 1) {
      const params = new URLSearchParams({
        gameId: 'a8db',
        priceFrom: String(priceFrom),
        priceTo: String(priceTo),
        orderBy: 'price',
        orderDir: 'asc',
        limit: '100',
      });
      if (cursor) params.set('cursor', cursor);

      const path = `/marketplace-api/v2/offers?${params}`;
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const data = await fetchJson(`https://api.dmarket.com${path}`, {
        headers: {
          'X-Api-Key': publicKey,
          'X-Sign-Date': timestamp,
          'X-Request-Sign': signDmarketRequest(path, timestamp, secretKey),
        },
      });

      const offers = data.items || data.offers || [];
      all.push(...offers);
      cursor = data.cursor || data.nextCursor || '';
      if (!cursor || offers.length === 0) break;
    }
  }

  return normalizeDmarketOffers(all);
}

export async function fetchDmarketOffers({ publicKey, secretKey, pagesPerRange = 3 } = {}) {
  try {
    return await fetchDmarketWebsiteOffers({ pagesPerRange });
  } catch (websiteError) {
    if (!publicKey || !secretKey) throw websiteError;

    try {
      return await fetchDmarketTradingOffers({ publicKey, secretKey, pagesPerRange });
    } catch (tradingError) {
      tradingError.message = `Website feed: ${websiteError.message}; Trading API: ${tradingError.message}`;
      throw tradingError;
    }
  }
}
