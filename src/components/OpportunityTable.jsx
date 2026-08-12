import { ExternalLink, Gauge, Info } from 'lucide-react';
import { formatMoney } from '../utils/formatting.js';

function ItemThumb({ item }) {
  const src = item.image || `/api/item-image?name=${encodeURIComponent(item.marketHashName)}`;
  return <span className={`item-thumb ${item.special ? 'special' : ''}`}><img src={src} alt="" loading="lazy" /></span>;
}

function Score({ item, onSelect }) {
  const tone = item.opportunity.score >= 75 ? 'strong' : item.opportunity.score >= 55 ? 'mixed' : 'weak';
  return <button className={`opportunity-score ${tone}`} type="button" onClick={() => onSelect(item)} title="Inspect score"><strong>{item.opportunity.score}</strong><span>/ 100</span></button>;
}

export function OpportunityTable({ items, loading, visibleCount, setVisibleCount, selected, onSelect }) {
  return (
    <section className="opportunity-table" aria-label="CS2 market opportunities">
      <div className="table-caption"><span>{items.length.toLocaleString()} ranked opportunities</span><span><Info size={13} /> Expected values use completed-sale evidence</span></div>
      <div className="table-scroll">
        <div className="table-grid table-header">
          <span>Item</span><span>Buy market</span><span>Buy now</span><span>Expected sale</span><span>Market evidence</span><span>Expected profit</span><span>Expected ROI</span><span>Score</span>
        </div>
        {loading ? (
          Array.from({ length: 8 }).map((_, index) => <div className="table-grid skeleton-row" key={index}><span /><span /><span /><span /><span /><span /><span /><span /></div>)
        ) : items.length === 0 ? (
          <div className="empty-state"><Gauge size={24} /><h3>No opportunities match</h3><p>Try broader confidence or market filters.</p></div>
        ) : items.slice(0, visibleCount).map((item) => (
          <div className={`table-grid table-row ${selected?.id === item.id ? 'selected' : ''}`} key={item.id}>
            <div className="item-cell"><ItemThumb item={item} /><div>
              <a href={item.buyUrl} target="_blank" rel="noreferrer">{item.weapon} <span>| {item.finish}</span><ExternalLink size={12} /></a>
              <small>{item.exterior}{item.stattrak ? ' · StatTrak' : ''}{item.souvenir ? ' · Souvenir' : ''}</small>
            </div></div>
            <div className="source-cell"><span className={`source-logo ${item.source}`}>{item.sourceLabel.slice(0, 1)}</span><span>{item.sourceLabel}<small>{item.sourceQuantity} listed</small></span></div>
            <div className="price-cell"><strong>{formatMoney(item.buyPrice)}</strong><small>Current listing</small></div>
            <div className="price-cell"><strong>{formatMoney(item.expectedSalePrice)}</strong><small>{formatMoney(item.exitFloor)} live floor</small></div>
            <div className="liquidity-cell"><span className={`liquidity-dot ${item.liquidity.label.toLowerCase()}`} /><span>{item.liquidity.label}<small>{item.market.salesVelocity.weekly} sales / 7d · {item.market.priceStability.label}</small></span></div>
            <strong className={item.expectedProfit >= 0 ? 'positive' : 'negative'}>{formatMoney(item.expectedProfit)}</strong>
            <div className="confidence-cell"><strong className={item.expectedRoi >= 0 ? 'positive' : 'negative'}>{item.expectedRoi.toFixed(2)}%</strong><small>{item.opportunity.confidence}% confidence</small></div>
            <Score item={item} onSelect={onSelect} />
          </div>
        ))}
      </div>
      {visibleCount < items.length && <button className="load-more" type="button" onClick={() => setVisibleCount((count) => count + 40)}>Show 40 more</button>}
    </section>
  );
}
