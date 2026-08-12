import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clearMarketCache, getOpportunityData } from './data-service.js';
import { findSteamItemImage } from './item-images.js';

const app = express();
const port = Number(process.env.PORT || 8787);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

app.disable('x-powered-by');
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/opportunities', async (request, response) => {
  const numberSetting = (key, fallback, min = 0, max = 30) => {
    const value = Number(request.query[key]);
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  };

  const settings = {
    exitMarket: request.query.exitMarket === 'steam' ? 'steam' : 'csfloat',
    applyDeductions: request.query.applyDeductions === 'true',
    saleFeePercent: numberSetting('saleFee', 2, 0, 10),
    cashoutFeePercent: numberSetting('cashoutFee', 0, 0, 10),
    riskBufferPercent: numberSetting('riskBuffer', 3, 0, 20),
    purchaseFeePercent: numberSetting('purchaseFee', 0, 0, 15),
    steamWalletRatePercent: numberSetting('steamWalletRate', 100, 25, 100),
  };

  try {
    response.json(await getOpportunityData(settings));
  } catch (error) {
    response.status(502).json({ error: 'Marketplace data could not be loaded.', detail: error.message });
  }
});

app.post('/api/refresh', (_request, response) => {
  clearMarketCache();
  response.status(202).json({ ok: true });
});

app.get('/api/item-image', async (request, response) => {
  const name = String(request.query.name || '').slice(0, 240);
  if (!name) return response.status(400).end();

  try {
    const image = await findSteamItemImage(name);
    if (!image) return response.status(204).end();
    response.set('Cache-Control', 'public, max-age=86400');
    return response.redirect(302, image);
  } catch {
    return response.status(204).end();
  }
});

app.use(express.static(path.join(root, 'dist')));
app.use((_request, response) => {
  response.sendFile(path.join(root, 'dist', 'index.html'));
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Skin Edge API listening on http://127.0.0.1:${port}`);
});
