export const DEFAULT_SETTINGS = {
  exitMarket: 'csfloat',
  applyDeductions: false,
  saleFee: 2,
  cashoutFee: 0,
  riskBuffer: 3,
  purchaseFee: 0,
  steamWalletRate: 100,
};

export const SORTS = {
  opportunity: { label: 'Opportunity score', value: (item) => item.opportunity.score },
  confidence: { label: 'Confidence', value: (item) => item.opportunity.confidence },
  expectedProfit: { label: 'Expected profit', value: (item) => item.expectedProfit },
  expectedRoi: { label: 'Expected ROI', value: (item) => item.expectedRoi },
  profit: { label: 'Current-floor profit', value: (item) => item.profit },
  roi: { label: 'Current-floor ROI', value: (item) => item.roi },
  liquidity: { label: 'Liquidity', value: (item) => item.liquidity.score },
};
