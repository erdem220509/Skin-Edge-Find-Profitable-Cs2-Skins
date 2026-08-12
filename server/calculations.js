const WEAR_PATTERN = /\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/;

export function parseItemName(marketHashName) {
  const exterior = marketHashName.match(WEAR_PATTERN)?.[1] ?? 'Not applicable';
  const withoutWear = marketHashName.replace(WEAR_PATTERN, '').trim();
  const [weaponPart, finishPart] = withoutWear.split(' | ');

  return {
    weapon: (weaponPart || withoutWear).replace(/^★\s*/, '').replace(/^StatTrak™\s*/, ''),
    finish: finishPart || 'Base item',
    exterior,
    stattrak: marketHashName.includes('StatTrak™'),
    souvenir: marketHashName.startsWith('Souvenir '),
    special: marketHashName.startsWith('★'),
  };
}

export function calculateOpportunity({
  buyPrice,
  exitFloor,
  exitMarket = 'csfloat',
  applyDeductions = false,
  saleFeePercent = 2,
  cashoutFeePercent = 0,
  riskBufferPercent = 3,
  purchaseFeePercent = 0,
  steamWalletRatePercent = 100,
}) {
  const purchaseFee = applyDeductions ? buyPrice * (purchaseFeePercent / 100) : 0;
  const purchaseCost = buyPrice + purchaseFee;
  const plannedListPrice = Math.max(0, exitFloor - 0.01);
  const steamExit = exitMarket === 'steam';
  const nominalProceeds = applyDeductions && steamExit
    ? steamSellerReceivesFromBuyerPrice(plannedListPrice)
    : plannedListPrice;
  const saleFee = applyDeductions
    ? steamExit
      ? plannedListPrice - nominalProceeds
      : plannedListPrice * (saleFeePercent / 100)
    : 0;
  const cashoutFee = applyDeductions && !steamExit
    ? plannedListPrice * (cashoutFeePercent / 100)
    : 0;
  const walletAdjustment = applyDeductions && steamExit
    ? nominalProceeds * (1 - steamWalletRatePercent / 100)
    : 0;
  const riskReserve = applyDeductions ? plannedListPrice * (riskBufferPercent / 100) : 0;
  const netProceeds =
    nominalProceeds - (steamExit ? 0 : saleFee) - cashoutFee - walletAdjustment - riskReserve;
  const profit = netProceeds - purchaseCost;

  const breakEvenSellPrice = !applyDeductions
    ? buyPrice
    : steamExit
      ? findSteamBreakEvenPrice({ purchaseCost, riskBufferPercent, steamWalletRatePercent })
      : purchaseCost /
        Math.max(0.01, 1 - (saleFeePercent + cashoutFeePercent + riskBufferPercent) / 100);

  return {
    deductionsApplied: applyDeductions,
    grossProfit: plannedListPrice - buyPrice,
    purchaseCost,
    purchaseFee,
    walletAdjustment,
    plannedListPrice,
    saleFee,
    cashoutFee,
    riskReserve,
    netProceeds,
    profit,
    roi: purchaseCost > 0 ? (profit / purchaseCost) * 100 : 0,
    breakEvenSellPrice,
  };
}

export function steamSellerReceivesFromBuyerPrice(buyerPrice) {
  const buyerCents = Math.max(0, Math.round(buyerPrice * 100));
  let low = 0;
  let high = buyerCents;
  let sellerCents = 0;

  while (low <= high) {
    const candidate = Math.floor((low + high) / 2);
    const steamFee = Math.max(1, Math.floor(candidate * 0.05));
    const gameFee = Math.max(1, Math.floor(candidate * 0.1));
    if (candidate + steamFee + gameFee <= buyerCents) {
      sellerCents = candidate;
      low = candidate + 1;
    } else {
      high = candidate - 1;
    }
  }

  return sellerCents / 100;
}

function findSteamBreakEvenPrice({ purchaseCost, riskBufferPercent, steamWalletRatePercent }) {
  const target = Math.max(0, purchaseCost);
  let low = 0;
  let high = Math.max(100, Math.ceil(target * 300));

  const netProceedsAt = (buyerCents) => {
    const buyerPrice = buyerCents / 100;
    return (
      steamSellerReceivesFromBuyerPrice(buyerPrice) * (steamWalletRatePercent / 100) -
      buyerPrice * (riskBufferPercent / 100)
    );
  };

  while (netProceedsAt(high) < target && high < 100_000_000) high *= 2;
  while (low < high) {
    const midpoint = Math.floor((low + high) / 2);
    if (netProceedsAt(midpoint) >= target) high = midpoint;
    else low = midpoint + 1;
  }

  return low / 100;
}

export function scoreLiquidity({ sourceQuantity = 0, exitQuantity = 0, volume24h = 0, volume7d = 0 }) {
  const score = Math.min(
    100,
    Math.round(
      Math.log10(sourceQuantity + 1) * 13 +
        Math.log10(exitQuantity + 1) * 18 +
        Math.log10(volume24h + 1) * 22 +
        Math.log10(volume7d + 1) * 14,
    ),
  );

  if (score >= 72) return { score, label: 'High' };
  if (score >= 45) return { score, label: 'Medium' };
  return { score, label: 'Low' };
}

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function finiteValues(values) {
  return values.filter((value) => Number.isFinite(value) && value > 0);
}

export function assessMarket({ exitFloor, sourceQuantity = 0, exitQuantity = 0, history, liquidityScore = 0 }) {
  const periods = [history?.last24h, history?.last7d, history?.last30d, history?.last90d];
  const medians = finiteValues(periods.map((period) => Number(period?.median)));
  const referenceMedian = Number(history?.last7d?.median) || Number(history?.last30d?.median) || Number(history?.last90d?.median) || null;
  const range = history?.last7d || history?.last30d;
  const rangeMedian = Number(range?.median);
  const rangeSpread = rangeMedian > 0 && Number.isFinite(Number(range?.min)) && Number.isFinite(Number(range?.max))
    ? (Number(range.max) - Number(range.min)) / rangeMedian
    : null;
  const medianDrift = medians.length > 1
    ? (Math.max(...medians) - Math.min(...medians)) / (medians.reduce((sum, value) => sum + value, 0) / medians.length)
    : null;
  const volatilityRatio = rangeSpread === null && medianDrift === null
    ? null
    : Math.max(rangeSpread || 0, medianDrift || 0);
  const volatilityPercent = volatilityRatio === null ? null : volatilityRatio * 100;
  const priceStabilityScore = volatilityRatio === null ? 35 : Math.round(clamp(100 - volatilityRatio * 220));
  const priceStability = {
    score: priceStabilityScore,
    volatilityPercent: volatilityPercent === null ? null : roundMoney(volatilityPercent),
    label: volatilityPercent === null ? 'Unknown' : volatilityPercent <= 8 ? 'Low volatility' : volatilityPercent <= 18 ? 'Moderate' : 'High volatility',
  };

  const volume24h = Number(history?.last24h?.volume) || 0;
  const volume7d = Number(history?.last7d?.volume) || 0;
  const volume30d = Number(history?.last30d?.volume) || 0;
  const dailySales = volume24h * 0.5 + (volume7d / 7) * 0.3 + (volume30d / 30) * 0.2;
  const salesVelocityScore = Math.round(clamp((Math.log10(dailySales + 1) / Math.log10(21)) * 100));
  const salesVelocity = {
    score: salesVelocityScore,
    daily: roundMoney(dailySales),
    weekly: volume7d,
    label: dailySales >= 5 ? 'Fast' : dailySales >= 1 ? 'Steady' : dailySales > 0 ? 'Slow' : 'No recent sales',
  };

  const depthScore = clamp((Math.log10(exitQuantity + 1) / Math.log10(51)) * 100);
  const sourceDepthScore = clamp((Math.log10(sourceQuantity + 1) / Math.log10(31)) * 100);
  const priceDeviation = referenceMedian && exitFloor > 0 ? Math.abs(exitFloor - referenceMedian) / referenceMedian : null;
  const priceAlignmentScore = priceDeviation === null ? 25 : clamp(100 - priceDeviation * 250);
  const historyCoverageScore = clamp((medians.length / 4) * 100);
  const spreadReliabilityScore = Math.round(
    depthScore * 0.3 + sourceDepthScore * 0.1 + priceAlignmentScore * 0.35 + historyCoverageScore * 0.25,
  );
  const spreadReliability = {
    score: spreadReliabilityScore,
    label: spreadReliabilityScore >= 72 ? 'Strong' : spreadReliabilityScore >= 45 ? 'Mixed' : 'Weak',
    referenceMedian: referenceMedian ? roundMoney(referenceMedian) : null,
  };

  // Until first-party snapshot history exists, cap the current floor with observed
  // sale medians. Missing sales receive a conservative haircut instead of fake certainty.
  const expectedSalePrice = roundMoney(
    referenceMedian
      ? Math.min(exitFloor, referenceMedian * 1.03)
      : exitFloor * 0.85,
  );
  const marketRiskScore = Math.round(clamp(
    (100 - priceStabilityScore) * 0.45 +
      (100 - liquidityScore) * 0.25 +
      (100 - spreadReliabilityScore) * 0.3,
  ));
  const marketRisk = {
    score: marketRiskScore,
    label: marketRiskScore <= 28 ? 'Low' : marketRiskScore <= 58 ? 'Moderate' : 'High',
  };

  return { expectedSalePrice, priceStability, salesVelocity, spreadReliability, marketRisk };
}

export function scoreOpportunity({ expectedProfit, expectedRoi, liquidityScore, market }) {
  const roiScore = clamp(((expectedRoi + 5) / 35) * 100);
  const profitScore = clamp((Math.log10(Math.max(0, expectedProfit) + 1) / Math.log10(201)) * 100);
  const components = {
    netRoi: Math.round(roiScore),
    expectedProfit: Math.round(profitScore),
    liquidity: Math.round(liquidityScore),
    priceStability: market.priceStability.score,
    salesVelocity: market.salesVelocity.score,
    spreadReliability: market.spreadReliability.score,
    marketSafety: 100 - market.marketRisk.score,
  };
  const score = Math.round(
    components.netRoi * 0.25 +
      components.expectedProfit * 0.15 +
      components.liquidity * 0.15 +
      components.priceStability * 0.1 +
      components.salesVelocity * 0.15 +
      components.spreadReliability * 0.15 +
      components.marketSafety * 0.05,
  );
  const confidence = Math.round(
    components.liquidity * 0.3 +
      components.priceStability * 0.2 +
      components.salesVelocity * 0.25 +
      components.spreadReliability * 0.25,
  );

  return { score, confidence, components };
}

export function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
