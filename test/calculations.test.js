import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOpportunity,
  parseItemName,
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
