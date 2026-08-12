import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Calculator,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  Filter,
  Gauge,
  Info,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  X,
} from 'lucide-react';

const DEFAULT_SETTINGS = {
  exitMarket: 'csfloat',
  applyDeductions: false,
  saleFee: 2,
  cashoutFee: 0,
  riskBuffer: 3,
  purchaseFee: 0,
  steamWalletRate: 100,
};

const SORTS = {
  profit: { label: 'Profit $', value: (item) => item.profit },
  roi: { label: 'Profit %', value: (item) => item.roi },
  buyPrice: { label: 'Buy price', value: (item) => item.buyPrice },
  exitFloor: { label: 'Exit price', value: (item) => item.exitFloor },
  liquidity: { label: 'Liquidity', value: (item) => item.liquidity.score },
};

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

function formatMoney(value) {
  return money.format(Number(value) || 0);
}

function timeAgo(date) {
  if (!date) return 'not synced';
  const seconds = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3600)}h ago`;
}

function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function SourceStatus({ source }) {
  const needsKey = source.status === 'needs-key';
  return (
    <div className="source-status" title={source.error || undefined}>
      <span className={`status-dot status-${source.status}`} />
      <span>{source.label}</span>
      {needsKey ? (
        <a href="https://support.dmarket.com/hc/en-us/articles/25268083913233-How-to-re-generate-Trading-API-keys" target="_blank" rel="noreferrer">
          New keys <ExternalLink size={10} />
        </a>
      ) : (
        <strong>{source.records.toLocaleString()}</strong>
      )}
    </div>
  );
}

function RiskDisclaimer({ onAccept }) {
  return (
    <div className="risk-backdrop">
      <section className="risk-dialog" role="dialog" aria-modal="true" aria-labelledby="risk-title">
        <div className="risk-heading">
          <span className="risk-mark"><ShieldCheck size={22} /></span>
          <div>
            <span className="eyebrow">Before you continue</span>
            <h2 id="risk-title">Market data is not a promise of profit</h2>
          </div>
        </div>
        <p>Skin Edge compares current listings and estimates possible spreads. It does not predict future prices, execute trades, or guarantee that an item will sell.</p>
        <div className="risk-points">
          <div><TrendingUp size={18} /><span><strong>Prefer high liquidity</strong><small>High liquidity is selected by default because stronger depth and sales activity usually make prices more reliable.</small></span></div>
          <div><Clock3 size={18} /><span><strong>Prices can change within seven days</strong><small>Trade restrictions can prevent an immediate resale. Nobody knows what the market price will be when the item becomes tradable.</small></span></div>
          <div><CircleAlert size={18} /><span><strong>You make the final decision</strong><small>Verify the listing, fees, float, stickers and restrictions. Any purchase, loss, or missed sale remains your responsibility.</small></span></div>
        </div>
        <button type="button" onClick={onAccept}>I understand and accept the risk</button>
      </section>
    </div>
  );
}

function ItemThumb({ item }) {
  const [failed, setFailed] = useState(false);
  const src = item.image || `/api/item-image?name=${encodeURIComponent(item.marketHashName)}`;

  return (
    <span className={`item-thumb ${item.special ? 'special' : ''}`}>
      {!failed ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span>{item.weapon.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}

function SortButton({ sort, direction, onReverse }) {
  return (
    <button className="sort-button" type="button" onClick={onReverse}>
      {direction === 'desc' ? <ArrowDown size={15} /> : <ArrowUp size={15} />}
      {SORTS[sort].label}
    </button>
  );
}

function Metric({ label, value, detail, tone }) {
  return (
    <div className={`metric ${tone || ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function SettingsPanel({ settings, setSettings, meta, onClose }) {
  const update = (key, value) => {
    setSettings((current) => ({ ...current, [key]: Number(value) }));
  };

  return (
    <aside className="settings-panel" aria-label="Profit assumptions">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Profit model</span>
          <h2>Assumptions</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} title="Close settings">
          <X size={18} />
        </button>
      </div>

      {!settings.applyDeductions && (
        <div className="settings-mode-note">
          These assumptions are saved but not applied while Gross spread is selected.
        </div>
      )}

      {settings.exitMarket === 'csfloat' ? (
        <div className="setting-group">
          <label htmlFor="sale-fee">
            <span>CSFloat sale fee</span>
            <output>{settings.saleFee}%</output>
          </label>
          <input id="sale-fee" type="range" min="0" max="5" step="0.25" value={settings.saleFee} onChange={(event) => update('saleFee', event.target.value)} />
        </div>
      ) : (
        <div className="fixed-fee-note">
          <strong>Steam fees: 5% + 10%</strong>
          <span>Calculated with Steam and CS2 minimum-cent rounding.</span>
        </div>
      )}

      <div className="setting-group">
        <label htmlFor="risk-buffer">
          <span>7-day risk buffer</span>
          <output>{settings.riskBuffer}%</output>
        </label>
        <input id="risk-buffer" type="range" min="0" max="15" step="0.5" value={settings.riskBuffer} onChange={(event) => update('riskBuffer', event.target.value)} />
      </div>

      <div className="setting-group">
        <label htmlFor="purchase-fee">
          <span>Purchase / payment fee</span>
          <output>{settings.purchaseFee}%</output>
        </label>
        <input id="purchase-fee" type="range" min="0" max="10" step="0.25" value={settings.purchaseFee} onChange={(event) => update('purchaseFee', event.target.value)} />
      </div>

      {settings.exitMarket === 'steam' && (
        <div className="setting-group steam-setting">
          <label htmlFor="steam-wallet-rate">
            <span>Steam Wallet cash value</span>
            <output>{settings.steamWalletRate}%</output>
          </label>
          <input id="steam-wallet-rate" type="range" min="25" max="100" step="1" value={settings.steamWalletRate} onChange={(event) => update('steamWalletRate', event.target.value)} />
          <small>Steam proceeds cannot be withdrawn. Set how much one Wallet dollar is worth to you.</small>
        </div>
      )}

      {settings.exitMarket === 'csfloat' && <div className="toggle-row">
        <div>
          <strong>Cash out after sale</strong>
          <span>Deduct a 2% withdrawal estimate</span>
        </div>
        <button
          className={`switch ${settings.cashoutFee > 0 ? 'active' : ''}`}
          type="button"
          role="switch"
          aria-checked={settings.cashoutFee > 0}
          onClick={() => update('cashoutFee', settings.cashoutFee > 0 ? 0 : 2)}
        >
          <span />
        </button>
      </div>}

      <div className="formula-block">
        <span>Current formula</span>
        <p>{settings.exitMarket === 'steam'
          ? 'Steam buyer price minus both market fees, Wallet value adjustment, risk reserve and purchase cost.'
          : 'CSFloat floor minus sale fee, cash-out fee, risk reserve and purchase cost.'}</p>
      </div>

      <div className="source-list">
        <span className="eyebrow">Data sources</span>
        {meta?.sources?.map((source) => <SourceStatus key={source.id} source={source} />)}
      </div>
    </aside>
  );
}

function DetailPanel({ item, onClose }) {
  if (!item) return null;

  const deductions = item.deductionsApplied
    ? [
        { label: 'Purchase price', value: item.buyPrice, prefix: '' },
        { label: 'Purchase fees', value: item.purchaseFee, prefix: '-' },
        { label: `${item.exitLabel} sale fees`, value: item.saleFee, prefix: '-' },
        ...(item.walletAdjustment > 0
          ? [{ label: 'Steam Wallet value adjustment', value: item.walletAdjustment, prefix: '-' }]
          : []),
        ...(item.cashoutFee > 0 ? [{ label: 'Cash-out fee', value: item.cashoutFee, prefix: '-' }] : []),
        { label: '7-day risk reserve', value: item.riskReserve, prefix: '-' },
      ]
    : [
        { label: 'Purchase price', value: item.buyPrice, prefix: '' },
        { label: `Gross ${item.exitLabel} price`, value: item.plannedListPrice, prefix: '+' },
      ];

  return (
    <aside className="detail-panel" aria-label={`${item.marketHashName} details`}>
      <div className="detail-visual">
        <ItemThumb item={item} />
        <button className="icon-button" type="button" onClick={onClose} title="Close details">
          <X size={18} />
        </button>
      </div>
      <span className="source-kicker">Buy on {item.sourceLabel}</span>
      <h2>{item.marketHashName}</h2>
      <div className="item-tags">
        <span>{item.exterior}</span>
        {item.stattrak && <span>StatTrak</span>}
        {item.souvenir && <span>Souvenir</span>}
      </div>

      <div className="detail-profit">
        <span>{item.deductionsApplied ? 'Estimated profit after deductions' : 'Estimated gross spread'}</span>
        <strong className={item.profit >= 0 ? 'positive' : 'negative'}>{formatMoney(item.profit)}</strong>
        <small>{item.roi.toFixed(2)}% return on purchase cost</small>
      </div>

      <dl className="calculation-list">
        {deductions.map(({ label, value, prefix }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={prefix === '+' ? 'positive' : ''}>{prefix}{formatMoney(value)}</dd>
          </div>
        ))}
        <div className="calculation-total">
          <dt>{item.deductionsApplied
            ? item.exitMarket === 'steam' ? 'Expected cash-equivalent proceeds' : `Expected ${item.exitLabel} proceeds`
            : 'Gross exit value'}</dt>
          <dd>{formatMoney(item.netProceeds)}</dd>
        </div>
      </dl>

      <div className="detail-facts">
        <div><span>{item.exitLabel} floor</span><strong>{formatMoney(item.exitFloor)}</strong></div>
        <div><span>Break-even sale</span><strong>{formatMoney(item.breakEvenSellPrice)}</strong></div>
        <div><span>Exit listings</span><strong>{item.exitQuantity}</strong></div>
        <div><span>Liquidity</span><strong>{item.liquidity.label}</strong></div>
      </div>

      <a className="primary-action" href={item.buyUrl} target="_blank" rel="noreferrer">
        Open {item.sourceLabel} listing <ExternalLink size={16} />
      </a>
      <a className="secondary-action" href={item.exitUrl} target="_blank" rel="noreferrer">
        View on {item.exitLabel} <ExternalLink size={15} />
      </a>
      <p className="detail-warning"><Info size={14} /> Verify the exact float, stickers and current price before buying.</p>
    </aside>
  );
}

export function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [liquidity, setLiquidity] = useState('high');
  const [profitableOnly, setProfitableOnly] = useState(true);
  const [sort, setSort] = useState('profit');
  const [direction, setDirection] = useState('desc');
  const [visibleCount, setVisibleCount] = useState(40);
  const [showRiskDisclaimer, setShowRiskDisclaimer] = useState(() => {
    try {
      return sessionStorage.getItem('skin-edge-risk-accepted') !== 'true';
    } catch {
      return true;
    }
  });
  const deferredQuery = useDeferredValue(query);

  const loadData = async ({ force = false } = {}) => {
    setError('');
    force ? setRefreshing(true) : setLoading(true);
    try {
      if (force) await fetch('/api/refresh', { method: 'POST' });
      const params = new URLSearchParams(settings);
      const response = await fetch(`/api/opportunities?${params}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || payload.error || 'Request failed');
      setData(payload);
      if (selected) {
        setSelected(payload.opportunities.find((item) => item.id === selected.id) || null);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => loadData(), 250);
    return () => clearTimeout(timeout);
  }, [settings.exitMarket, settings.applyDeductions, settings.saleFee, settings.cashoutFee, settings.riskBuffer, settings.purchaseFee, settings.steamWalletRate]);

  useEffect(() => setVisibleCount(40), [deferredQuery, source, liquidity, profitableOnly, sort, direction]);

  const filtered = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const items = (data?.opportunities || []).filter((item) => {
      if (profitableOnly && !item.profitable) return false;
      if (source !== 'all' && item.source !== source) return false;
      if (liquidity !== 'all' && item.liquidity.label.toLowerCase() !== liquidity) return false;
      if (normalizedQuery && !item.marketHashName.toLowerCase().includes(normalizedQuery)) return false;
      return true;
    });
    const multiplier = direction === 'desc' ? -1 : 1;
    return items.sort((a, b) => (SORTS[sort].value(a) - SORTS[sort].value(b)) * multiplier);
  }, [data, deferredQuery, source, liquidity, profitableOnly, sort, direction]);

  const sourceCounts = useMemo(() => {
    return data?.meta?.sourceMatches || { skinport: 0, dmarket: 0 };
  }, [data]);

  const summary = useMemo(() => {
    const profitable = (data?.opportunities || []).filter((item) => item.profitable);
    const highConfidence = profitable.filter((item) => item.liquidity.label === 'High');
    const avgRoi = highConfidence.length
      ? highConfidence.reduce((total, item) => total + item.roi, 0) / highConfidence.length
      : 0;
    return { profitable, highConfidence, avgRoi, best: highConfidence[0] || profitable[0] };
  }, [data]);

  const reverseSort = () => setDirection((current) => (current === 'desc' ? 'asc' : 'desc'));
  const selectProfitSort = (nextSort) => {
    setSort(nextSort);
    setDirection('desc');
  };

  const selectSource = (nextSource) => {
    setSource(nextSource);
    if (nextSource === 'dmarket') setLiquidity('all');
  };

  const exitLabel = settings.exitMarket === 'steam' ? 'Steam Market' : 'CSFloat';
  const profitModeLabel = settings.applyDeductions ? 'After deductions' : 'Gross spread';
  const selectExitMarket = (exitMarket) => {
    setSelected(null);
    setSettings((current) => ({ ...current, exitMarket }));
  };
  const acceptRisk = () => {
    try {
      sessionStorage.setItem('skin-edge-risk-accepted', 'true');
    } catch {
      // The acknowledgement still closes if browser storage is unavailable.
    }
    setShowRiskDisclaimer(false);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Skin Edge home">
          <LogoMark />
          <span>SKIN EDGE</span>
        </a>
        <div className="exit-market-control" aria-label="Resale market">
          <ShieldCheck size={14} />
          <span>Sell on</span>
          <div className="exit-market-toggle">
            <button aria-pressed={settings.exitMarket === 'csfloat'} className={settings.exitMarket === 'csfloat' ? 'active' : ''} type="button" onClick={() => selectExitMarket('csfloat')}>CSFloat</button>
            <button aria-pressed={settings.exitMarket === 'steam'} className={settings.exitMarket === 'steam' ? 'active' : ''} type="button" onClick={() => selectExitMarket('steam')}>Steam</button>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="sync-label">Synced {timeAgo(data?.meta?.oldestSourceAt)}</span>
          <button className="icon-button" type="button" onClick={() => loadData({ force: true })} title="Refresh market data" disabled={refreshing}>
            <RefreshCw size={17} className={refreshing ? 'spinning' : ''} />
          </button>
          <button className={`settings-button ${showSettings ? 'active' : ''}`} type="button" aria-label="Profit assumptions" onClick={() => { setSelected(null); setShowSettings((current) => !current); }}>
            <Settings2 size={16} /> <span>Assumptions</span>
          </button>
        </div>
      </header>

      <main>
        <section className="workspace-heading">
          <div>
            <span className="eyebrow">Cross-market scanner</span>
            <h1>Profit opportunities</h1>
            <p>Buy on Skinport or DMarket, sell on {exitLabel}. Compare the raw spread or apply every configured deduction.</p>
          </div>
          <div className="live-state"><span /> Live market data</div>
        </section>

        {error && (
          <div className="error-banner">
            <CircleAlert size={17} />
            <span><strong>Data refresh failed.</strong> {error}</span>
            <button type="button" onClick={() => loadData()}>Retry</button>
          </div>
        )}

        <section className="profit-model-bar" aria-label="Profit calculation mode">
          <div>
            <Calculator size={18} />
            <span>
              <strong>Profit display</strong>
              <small>{settings.applyDeductions ? 'All fees, Wallet value and risk reserve applied' : 'No marketplace fees or reserves applied'}</small>
            </span>
          </div>
          <div className="calculation-mode-toggle">
            <button aria-pressed={!settings.applyDeductions} className={!settings.applyDeductions ? 'active' : ''} type="button" onClick={() => setSettings((current) => ({ ...current, applyDeductions: false }))}>Gross spread</button>
            <button aria-pressed={settings.applyDeductions} className={settings.applyDeductions ? 'active' : ''} type="button" onClick={() => setSettings((current) => ({ ...current, applyDeductions: true }))}>After deductions</button>
          </div>
        </section>

        <section className="metrics-band" aria-label="Opportunity summary">
          <Metric label={`${profitModeLabel} winners`} value={loading ? '—' : summary.profitable.length.toLocaleString()} detail={`${data?.meta?.matchedItems?.toLocaleString() || 0} exact-name matches`} tone="accent" />
          <Metric label="High liquidity" value={loading ? '—' : summary.highConfidence.length.toLocaleString()} detail="Stronger depth and sales" />
          <Metric label="Average liquid ROI" value={loading ? '—' : `${summary.avgRoi.toFixed(1)}%`} detail="Across high-liquidity matches" />
          <Metric label={`Best ${profitModeLabel.toLowerCase()}`} value={loading ? '—' : formatMoney(summary.best?.profit)} detail={summary.best?.weapon || 'No match available'} />
        </section>

        <section className="controls" aria-label="Opportunity filters">
          <div className="search-field">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search weapon, finish, wear..." aria-label="Search items" />
            {query && <button className="clear-search" type="button" onClick={() => setQuery('')} title="Clear search"><X size={15} /></button>}
          </div>

          <div className="control-group">
            <Filter size={15} />
            <select value={source} onChange={(event) => selectSource(event.target.value)} aria-label="Purchase source">
              <option value="all">All buy markets ({Object.values(sourceCounts).reduce((sum, count) => sum + count, 0).toLocaleString()})</option>
              <option value="skinport">Skinport ({sourceCounts.skinport.toLocaleString()})</option>
              <option value="dmarket">DMarket ({sourceCounts.dmarket.toLocaleString()})</option>
            </select>
            <select value={liquidity} onChange={(event) => setLiquidity(event.target.value)} aria-label="Liquidity level">
              <option value="all">All liquidity</option>
              <option value="high">High liquidity</option>
              <option value="medium">Medium liquidity</option>
              <option value="low">Low liquidity</option>
            </select>
          </div>

          <label className="checkbox-control">
            <input type="checkbox" checked={profitableOnly} onChange={(event) => setProfitableOnly(event.target.checked)} />
            <span><Check size={12} /></span>
            Profitable only
          </label>

          <div className="profit-sort-toggle" aria-label="Profit ranking mode">
            <button className={sort === 'profit' ? 'active' : ''} type="button" onClick={() => selectProfitSort('profit')}>Profit $</button>
            <button className={sort === 'roi' ? 'active' : ''} type="button" onClick={() => selectProfitSort('roi')}>Profit %</button>
          </div>

          <div className="sort-controls">
            <SlidersHorizontal size={15} />
            <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort opportunities">
              {Object.entries(SORTS).map(([value, option]) => <option value={value} key={value}>{option.label}</option>)}
            </select>
            <SortButton sort={sort} direction={direction} onReverse={reverseSort} />
          </div>
        </section>

        <section className="opportunity-table" aria-label="CS2 skin opportunities">
          <div className="table-caption">
            <span>{filtered.length.toLocaleString()} opportunities</span>
            <span><Info size={13} /> Click an item name to open its buy listing</span>
          </div>
          <div className="table-scroll">
            <div className="table-grid table-header">
              <span>Item</span>
              <span>Buy market</span>
              <span>Buy now</span>
              <span>{exitLabel} exit</span>
              <span>Liquidity</span>
              <span>{settings.applyDeductions ? 'Deducted profit' : 'Gross profit'}</span>
              <span>Profit %</span>
              <span aria-hidden="true" />
            </div>

            {loading && !data ? (
              Array.from({ length: 8 }).map((_, index) => <div className="table-grid skeleton-row" key={index}><span /><span /><span /><span /><span /><span /><span /><span /></div>)
            ) : filtered.length === 0 ? (
              <div className="empty-state"><Gauge size={24} /><h3>No opportunities match</h3><p>Try a lower risk buffer or broader filters.</p></div>
            ) : (
              filtered.slice(0, visibleCount).map((item) => (
                <div className={`table-grid table-row ${selected?.id === item.id ? 'selected' : ''}`} key={item.id}>
                  <div className="item-cell">
                    <ItemThumb item={item} />
                    <div>
                      <a href={item.buyUrl} target="_blank" rel="noreferrer" title={`Open on ${item.sourceLabel}`}>
                        {item.weapon} <span>| {item.finish}</span>
                        <ExternalLink size={12} />
                      </a>
                      <small>{item.exterior}{item.stattrak ? ' · StatTrak' : ''}{item.souvenir ? ' · Souvenir' : ''}</small>
                    </div>
                  </div>
                  <div className="source-cell"><span className={`source-logo ${item.source}`}>{item.sourceLabel.slice(0, 1)}</span><span>{item.sourceLabel}<small>{item.sourceQuantity} listed</small></span></div>
                  <div className="price-cell"><strong>{formatMoney(item.buyPrice)}</strong>{item.purchaseFee > 0 && <small>{formatMoney(item.purchaseCost)} total cost</small>}</div>
                  <div className="price-cell"><strong>{formatMoney(item.plannedListPrice)}</strong><small>{item.exitQuantity} listed</small></div>
                  <div className="liquidity-cell"><span className={`liquidity-dot ${item.liquidity.label.toLowerCase()}`} /><span>{item.liquidity.label}<small>{item.saleVolume7d} reference sales / 7d</small></span></div>
                  <strong className={item.profit >= 0 ? 'positive' : 'negative'}>{formatMoney(item.profit)}</strong>
                  <strong className={item.roi >= 0 ? 'positive' : 'negative'}>{item.roi.toFixed(2)}%</strong>
                  <button className="row-action" type="button" onClick={() => { setShowSettings(false); setSelected(item); }} title="Inspect calculation"><ChevronRight size={17} /></button>
                </div>
              ))
            )}
          </div>
          {visibleCount < filtered.length && (
            <button className="load-more" type="button" onClick={() => setVisibleCount((count) => count + 40)}>Show 40 more</button>
          )}
        </section>

        <footer className="workspace-footer">
          <span><CircleAlert size={14} /> Estimates are not guaranteed profit. Prices can move during Steam's seven-day restriction.</span>
          <span>USD · exact market-name matching</span>
        </footer>
      </main>

      {showRiskDisclaimer && <RiskDisclaimer onAccept={acceptRisk} />}

      {(showSettings || selected) && <button className="panel-backdrop" type="button" aria-label="Close panel" onClick={() => { setShowSettings(false); setSelected(null); }} />}
      {showSettings && <SettingsPanel settings={settings} setSettings={setSettings} meta={data?.meta} onClose={() => setShowSettings(false)} />}
      {selected && <DetailPanel item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
