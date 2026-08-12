import { CircleAlert, Clock3, ShieldCheck, TrendingUp } from 'lucide-react';

export function RiskDisclaimer({ onAccept }) {
  return (
    <div className="risk-backdrop">
      <section className="risk-dialog" role="dialog" aria-modal="true" aria-labelledby="risk-title">
        <div className="risk-heading">
          <span className="risk-mark"><ShieldCheck size={22} /></span>
          <div><span className="eyebrow">Before you continue</span><h2 id="risk-title">Market data is not a promise of profit</h2></div>
        </div>
        <p>Skin Edge estimates sellability from current depth and recent completed-sale evidence. It does not predict future prices, execute trades, or guarantee a sale.</p>
        <div className="risk-points">
          <div><TrendingUp size={18} /><span><strong>Rank confidence, not just spread</strong><small>Opportunity Score combines expected economics with liquidity, velocity, stability, reliability and market risk.</small></span></div>
          <div><Clock3 size={18} /><span><strong>Prices can change within seven days</strong><small>Trade restrictions can prevent an immediate resale. Expected values are estimates, not forecasts.</small></span></div>
          <div><CircleAlert size={18} /><span><strong>You make the final decision</strong><small>Verify the listing, fees, float, stickers and restrictions before buying.</small></span></div>
        </div>
        <button type="button" onClick={onAccept}>I understand and accept the risk</button>
      </section>
    </div>
  );
}
