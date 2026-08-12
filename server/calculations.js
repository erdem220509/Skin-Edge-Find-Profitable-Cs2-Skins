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

export function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
