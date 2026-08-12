const imageCache = new Map();
const pending = new Map();

export async function findSteamItemImage(marketHashName) {
  if (imageCache.has(marketHashName)) return imageCache.get(marketHashName);
  if (pending.has(marketHashName)) return pending.get(marketHashName);

  const request = (async () => {
    const params = new URLSearchParams({
      query: marketHashName,
      start: '0',
      count: '10',
      search_descriptions: '0',
      sort_column: 'name',
      sort_dir: 'asc',
      appid: '730',
      norender: '1',
    });
    const response = await fetch(`https://steamcommunity.com/market/search/render/?${params}`, {
      headers: { 'User-Agent': 'SkinEdge/0.1 item image lookup' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Steam image lookup returned ${response.status}`);
    const data = await response.json();
    const match = data.results?.find(
      (result) => result.asset_description?.market_hash_name === marketHashName,
    );
    const icon = match?.asset_description?.icon_url_large || match?.asset_description?.icon_url;
    const url = icon ? `https://community.cloudflare.steamstatic.com/economy/image/${icon}/240fx160f` : null;
    imageCache.set(marketHashName, url);
    return url;
  })().finally(() => pending.delete(marketHashName));

  pending.set(marketHashName, request);
  return request;
}
