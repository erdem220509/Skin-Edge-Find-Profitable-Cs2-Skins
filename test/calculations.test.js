import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessMarket,
  calculateOpportunity,
  parseItemName,
  scoreOpportunity,
  scoreLiquidity,
  steamSellerReceivesFromBuyerPrice,
} from '../server/calculations.js';

test('calculates all deductions from the CSFloat exit', () => {
  const result = calculateOpportunity({
    buyPrice: 90,
    exitFloor: 110,
    applyDeductions: true,
    saleFeePercent: 2,
    cashoutFeePercent: 2,
    riskBufferPercent: 3,
    purchaseFeePercent: 1,
  });

  assert.equal(result.purchaseCost, 90.9);
  assert.equal(result.plannedListPrice, 109.99);
  assert.ok(Math.abs(result.profit - 11.391) < 0.001);
});

test('parses common CS2 item variants', () => {
  assert.deepEqual(parseItemName('StatTrak\u2122 AK-47 | Redline (Field-Tested)'), {
    weapon: 'AK-47',
    finish: 'Redline',
    exterior: 'Field-Tested',
    stattrak: true,
    souvenir: false,
    special: false,
  });
});

test('liquidity scores remain bounded', () => {
  assert.equal(scoreLiquidity({}).label, 'Low');
  assert.equal(scoreLiquidity({ sourceQuantity: 10000, exitQuantity: 10000, volume24h: 5000, volume7d: 20000 }).score, 100);
});

test('calculates Steam seller proceeds with Steam and CS2 fee rounding', () => {
  assert.equal(steamSellerReceivesFromBuyerPrice(10), 8.7);
  assert.equal(steamSellerReceivesFromBuyerPrice(0.03), 0.01);
});

test('values Steam exit proceeds using the configured Wallet rate', () => {
  const result = calculateOpportunity({
    buyPrice: 75,
    exitFloor: 100,
    exitMarket: 'steam',
    applyDeductions: true,
    riskBufferPercent: 3,
    steamWalletRatePercent: 75,
    cashoutFeePercent: 2,
  });

  assert.equal(result.purchaseCost, 75);
  assert.equal(result.cashoutFee, 0);
  assert.ok(result.saleFee > 13);
  assert.ok(result.walletAdjustment > 21);
  assert.ok(result.profit < 0);
});

test('shows gross spread until deductions are enabled', () => {
  const result = calculateOpportunity({
    buyPrice: 75,
    exitFloor: 100,
    exitMarket: 'steam',
    saleFeePercent: 10,
    cashoutFeePercent: 5,
    riskBufferPercent: 5,
    purchaseFeePercent: 5,
  });

  assert.equal(result.deductionsApplied, false);
  assert.equal(result.purchaseFee, 0);
  assert.equal(result.saleFee, 0);
  assert.equal(result.cashoutFee, 0);
  assert.ok(Math.abs(result.profit - 24.99) < 0.001);
});

test('caps expected sale value when the current floor is above recent sales', () => {
  const market = assessMarket({
    exitFloor: 102,
    sourceQuantity: 8,
    exitQuantity: 12,
    liquidityScore: 70,
    history: {
      last24h: { median: 91, min: 89, max: 94, volume: 4 },
      last7d: { median: 92, min: 87, max: 97, volume: 37 },
      last30d: { median: 90, min: 83, max: 99, volume: 140 },
      last90d: { median: 89, min: 75, max: 101, volume: 380 },
    },
  });

  assert.equal(market.expectedSalePrice, 94.76);
  assert.equal(market.salesVelocity.weekly, 37);
  assert.ok(market.spreadReliability.score > 40);
});

test('opportunity score rewards reliable economics but remains bounded', () => {
  const result = scoreOpportunity({
    expectedProfit: 12,
    expectedRoi: 14,
    liquidityScore: 82,
    market: {
      priceStability: { score: 85 },
      salesVelocity: { score: 80 },
      spreadReliability: { score: 88 },
      marketRisk: { score: 18 },
    },
  });

  assert.ok(result.score >= 70 && result.score <= 100);
  assert.ok(result.confidence >= 80 && result.confidence <= 100);
});
