import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Calculator, CircleAlert, Info } from 'lucide-react';
import { AssumptionsPanel } from './components/AssumptionsPanel.jsx';
import { Filters } from './components/Filters.jsx';
import { MarketStatus } from './components/MarketStatus.jsx';
import { OpportunityCard } from './components/OpportunityCard.jsx';
import { OpportunityTable } from './components/OpportunityTable.jsx';
import { RiskDisclaimer } from './components/RiskDisclaimer.jsx';
import { DEFAULT_SETTINGS, SORTS } from './config/opportunities.js';
import { useOpportunities } from './hooks/useOpportunities.js';
import { formatMoney } from './utils/formatting.js';

function Metric({ label, value, detail, tone }) {
  return <div className={`metric ${tone || ''}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

export function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const { data, error, loading, refreshing, loadData } = useOpportunities(settings);
  const [showSettings, setShowSettings] = useState(false);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [liquidity, setLiquidity] = useState('all');
  const [profitableOnly, setProfitableOnly] = useState(true);
  const [sort, setSort] = useState('opportunity');
  const [direction, setDirection] = useState('desc');
  const [visibleCount, setVisibleCount] = useState(40);
  const [showRiskDisclaimer, setShowRiskDisclaimer] = useState(() => {
    try { return sessionStorage.getItem('skin-edge-risk-accepted') !== 'true'; } catch { return true; }
  });
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (selected && data) setSelected(data.opportunities.find((item) => item.id === selected.id) || null);
  }, [data]);
  useEffect(() => setVisibleCount(40), [deferredQuery, source, liquidity, profitableOnly, sort, direction]);

  const filtered = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const items = (data?.opportunities || []).filter((item) => {
      if (profitableOnly && item.expectedProfit <= 0) return false;
      if (source !== 'all' && item.source !== source) return false;
      if (liquidity !== 'all' && item.liquidity.label.toLowerCase() !== liquidity) return false;
      return !normalizedQuery || item.marketHashName.toLowerCase().includes(normalizedQuery);
    });
    const multiplier = direction === 'desc' ? -1 : 1;
    return items.sort((a, b) => (SORTS[sort].value(a) - SORTS[sort].value(b)) * multiplier);
  }, [data, deferredQuery, source, liquidity, profitableOnly, sort, direction]);

  const summary = useMemo(() => {
    const opportunities = data?.opportunities || [];
    const profitable = opportunities.filter((item) => item.expectedProfit > 0);
    const highConfidence = profitable.filter((item) => item.opportunity.confidence >= 70);
    const averageRoi = highConfidence.length ? highConfidence.reduce((sum, item) => sum + item.expectedRoi, 0) / highConfidence.length : 0;
    const best = opportunities.reduce((leader, item) => !leader || item.opportunity.score > leader.opportunity.score ? item : leader, null);
    return { profitable, highConfidence, averageRoi, best };
  }, [data]);

  const sourceCounts = data?.meta?.sourceMatches || { skinport: 0, dmarket: 0 };
  const exitLabel = settings.exitMarket === 'steam' ? 'Steam Market' : 'CSFloat';
  const acceptRisk = () => {
    try { sessionStorage.setItem('skin-edge-risk-accepted', 'true'); } catch { /* storage is optional */ }
    setShowRiskDisclaimer(false);
  };

  return (
    <div className="app-shell">
      <MarketStatus settings={settings} setSettings={setSettings} meta={data?.meta} refreshing={refreshing} onRefresh={() => loadData({ force: true })} showSettings={showSettings} onToggleSettings={() => { setSelected(null); setShowSettings((current) => !current); }} />
      <main>
        <section className="workspace-heading">
          <div><span className="eyebrow">Market opportunity engine</span><h1>Rank what can actually sell.</h1><p>Compare current spreads with recent sales, price stability and market depth before risking capital.</p></div>
          <div className="live-state"><span /> Live market data</div>
        </section>
        {error && <div className="error-banner"><CircleAlert size={17} /><span><strong>Data refresh failed.</strong> {error}</span><button type="button" onClick={() => loadData()}>Retry</button></div>}
        <section className="profit-model-bar" aria-label="Profit calculation mode">
          <div><Calculator size={18} /><span><strong>Expected value model</strong><small>Recent completed-sale medians cap optimistic live floors</small></span></div>
          <div className="calculation-mode-toggle">
            <button aria-pressed={!settings.applyDeductions} className={!settings.applyDeductions ? 'active' : ''} type="button" onClick={() => setSettings((current) => ({ ...current, applyDeductions: false }))}>Gross spread</button>
            <button aria-pressed={settings.applyDeductions} className={settings.applyDeductions ? 'active' : ''} type="button" onClick={() => setSettings((current) => ({ ...current, applyDeductions: true }))}>After deductions</button>
          </div>
        </section>
        <section className="metrics-band" aria-label="Opportunity summary">
          <Metric label="Expected-profit opportunities" value={loading && !data ? '—' : summary.profitable.length.toLocaleString()} detail={`${data?.meta?.matchedItems?.toLocaleString() || 0} exact-name matches`} tone="accent" />
          <Metric label="High confidence" value={loading && !data ? '—' : summary.highConfidence.length.toLocaleString()} detail="Confidence score of 70 or higher" />
          <Metric label="Expected ROI" value={loading && !data ? '—' : `${summary.averageRoi.toFixed(1)}%`} detail="Average across high-confidence results" />
          <Metric label="Leading opportunity" value={loading && !data ? '—' : `${summary.best?.opportunity.score || 0}/100`} detail={summary.best ? `${summary.best.weapon} · ${formatMoney(summary.best.expectedProfit)}` : 'No match available'} />
        </section>
        <Filters query={query} setQuery={setQuery} source={source} setSource={setSource} liquidity={liquidity} setLiquidity={setLiquidity} profitableOnly={profitableOnly} setProfitableOnly={setProfitableOnly} sort={sort} setSort={setSort} direction={direction} setDirection={setDirection} sourceCounts={sourceCounts} />
        <OpportunityTable items={filtered} loading={loading && !data} visibleCount={visibleCount} setVisibleCount={setVisibleCount} selected={selected} onSelect={(item) => { setShowSettings(false); setSelected(item); }} />
        <footer className="workspace-footer"><span><CircleAlert size={14} /> Scores are transparent heuristics, not guaranteed profit or future-price predictions.</span><span><Info size={13} /> USD · exact market-name matching · sell on {exitLabel}</span></footer>
      </main>
      {showRiskDisclaimer && <RiskDisclaimer onAccept={acceptRisk} />}
      {(showSettings || selected) && <button className="panel-backdrop" type="button" aria-label="Close panel" onClick={() => { setShowSettings(false); setSelected(null); }} />}
      {showSettings && <AssumptionsPanel settings={settings} setSettings={setSettings} meta={data?.meta} onClose={() => setShowSettings(false)} />}
      {selected && <OpportunityCard item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
