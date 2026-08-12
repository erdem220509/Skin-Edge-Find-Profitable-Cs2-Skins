import { RefreshCw, Settings2, ShieldCheck } from 'lucide-react';
import { timeAgo } from '../utils/formatting.js';

function LogoMark() {
  return <span className="logo-mark" aria-hidden="true"><span /><span /><span /></span>;
}

export function MarketStatus({ settings, setSettings, meta, refreshing, onRefresh, showSettings, onToggleSettings }) {
  const selectExitMarket = (exitMarket) => setSettings((current) => ({ ...current, exitMarket }));

  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="Skin Edge home"><LogoMark /><span>SKIN EDGE</span></a>
      <div className="exit-market-control" aria-label="Resale market">
        <ShieldCheck size={14} /><span>Sell on</span>
        <div className="exit-market-toggle">
          {['csfloat', 'steam'].map((market) => (
            <button key={market} aria-pressed={settings.exitMarket === market} className={settings.exitMarket === market ? 'active' : ''} type="button" onClick={() => selectExitMarket(market)}>
              {market === 'csfloat' ? 'CSFloat' : 'Steam'}
            </button>
          ))}
        </div>
      </div>
      <div className="topbar-actions">
        <span className="sync-label">Synced {timeAgo(meta?.oldestSourceAt)}</span>
        <button className="icon-button" type="button" onClick={onRefresh} title="Refresh market data" disabled={refreshing}>
          <RefreshCw size={17} className={refreshing ? 'spinning' : ''} />
        </button>
        <button className={`settings-button ${showSettings ? 'active' : ''}`} type="button" aria-label="Profit assumptions" onClick={onToggleSettings}>
          <Settings2 size={16} /><span>Assumptions</span>
        </button>
      </div>
    </header>
  );
}
