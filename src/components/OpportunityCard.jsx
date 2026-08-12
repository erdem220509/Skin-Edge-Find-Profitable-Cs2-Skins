import { ExternalLink, Info, X } from 'lucide-react';
import { formatMoney } from '../utils/formatting.js';

const COMPONENT_LABELS = {
  netRoi: 'Net ROI', expectedProfit: 'Expected profit', liquidity: 'Liquidity',
  priceStability: 'Price stability', salesVelocity: 'Sales velocity',
  spreadReliability: 'Spread reliability', marketSafety: 'Market safety',
};

export function OpportunityCard({ item, onClose }) {
  if (!item) return null;
  return (
    <aside className="detail-panel" aria-label={`${item.marketHashName} opportunity details`}>
      <div className="detail-visual">
        <img src={item.image || `/api/item-image?name=${encodeURIComponent(item.marketHashName)}`} alt="" />
        <button className="icon-button" type="button" onClick={onClose} title="Close details"><X size={18} /></button>
      </div>
      <span className="source-kicker">Buy on {item.sourceLabel}</span><h2>{item.marketHashName}</h2>
      <div className="item-tags"><span>{item.exterior}</span>{item.stattrak && <span>StatTrak</span>}{item.souvenir && <span>Souvenir</span>}</div>
      <div className="score-hero">
        <div><span>Opportunity Score</span><strong>{item.opportunity.score}<small>/100</small></strong></div>
        <div><span>Confidence</span><strong>{item.opportunity.confidence}%</strong></div>
      </div>
      <div className="detail-profit">
        <span>Reliability-adjusted economics</span>
        <strong className={item.expectedProfit >= 0 ? 'positive' : 'negative'}>{formatMoney(item.expectedProfit)}</strong>
        <small>{item.expectedRoi.toFixed(2)}% expected ROI at {formatMoney(item.expectedSalePrice)}</small>
      </div>
      <div className="score-anatomy">
        <span className="eyebrow">Score anatomy</span>
        {Object.entries(item.opportunity.components).map(([key, value]) => (
          <div className="score-factor" key={key}><span>{COMPONENT_LABELS[key]}</span><i><b style={{ width: `${value}%` }} /></i><strong>{value}</strong></div>
        ))}
      </div>
      <div className="detail-facts">
        <div><span>Current exit floor</span><strong>{formatMoney(item.exitFloor)}</strong></div>
        <div><span>7-day sale median</span><strong>{item.saleMedian7d ? formatMoney(item.saleMedian7d) : 'No data'}</strong></div>
        <div><span>Sales velocity</span><strong>{item.market.salesVelocity.weekly}/week</strong></div>
        <div><span>Price volatility</span><strong>{item.market.priceStability.volatilityPercent === null ? 'Unknown' : `${item.market.priceStability.volatilityPercent}%`}</strong></div>
        <div><span>Spread reliability</span><strong>{item.market.spreadReliability.label}</strong></div>
        <div><span>Market risk</span><strong>{item.market.marketRisk.label}</strong></div>
      </div>
      <a className="primary-action" href={item.buyUrl} target="_blank" rel="noreferrer">Open {item.sourceLabel} listing <ExternalLink size={16} /></a>
      <a className="secondary-action" href={item.exitUrl} target="_blank" rel="noreferrer">View on {item.exitLabel} <ExternalLink size={15} /></a>
      <p className="detail-warning"><Info size={14} /> This is a transparent heuristic, not a future-price prediction. Verify the exact item before buying.</p>
    </aside>
  );
}
