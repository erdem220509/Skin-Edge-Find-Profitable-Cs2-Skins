import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeDmarketOffers } from '../server/marketplaces.js';

test('normalizes the current DMarket v2 offers response shape', () => {
  const [offer] = normalizeDmarketOffers([{
    offerId: 'offer-123',
    priceCents: 12345,
    attributes: {
      title: 'AK-47 | Redline (Field-Tested)',
      imageUri: 'https://cdn.dmarket.com/example.png',
    },
  }]);

  assert.deepEqual(offer, {
    marketHashName: 'AK-47 | Redline (Field-Tested)',
    minPrice: 123.45,
    quantity: 1,
    image: 'https://cdn.dmarket.com/example.png',
    offerId: 'offer-123',
    url: 'https://dmarket.com/ingame-items/item-list/csgo-skins?userOfferId=offer-123',
  });
});
