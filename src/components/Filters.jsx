import { ArrowDown, ArrowUp, Check, Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { SORTS } from '../config/opportunities.js';

export function Filters({ query, setQuery, source, setSource, liquidity, setLiquidity, profitableOnly, setProfitableOnly, sort, setSort, direction, setDirection, sourceCounts }) {
  const sourceTotal = Object.values(sourceCounts).reduce((sum, count) => sum + count, 0);
  return (
    <section className="controls" aria-label="Opportunity filters">
      <div className="search-field">
        <Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search weapon, finish, wear..." aria-label="Search items" />
        {query && <button className="clear-search" type="button" onClick={() => setQuery('')} title="Clear search"><X size={15} /></button>}
      </div>
      <div className="control-group">
        <Filter size={15} />
        <select value={source} onChange={(event) => setSource(event.target.value)} aria-label="Purchase source">
          <option value="all">All buy markets ({sourceTotal.toLocaleString()})</option>
          <option value="skinport">Skinport ({sourceCounts.skinport.toLocaleString()})</option>
          <option value="dmarket">DMarket ({sourceCounts.dmarket.toLocaleString()})</option>
        </select>
        <select value={liquidity} onChange={(event) => setLiquidity(event.target.value)} aria-label="Liquidity level">
          <option value="all">All liquidity</option><option value="high">High liquidity</option><option value="medium">Medium liquidity</option><option value="low">Low liquidity</option>
        </select>
      </div>
      <label className="checkbox-control">
        <input type="checkbox" checked={profitableOnly} onChange={(event) => setProfitableOnly(event.target.checked)} />
        <span><Check size={12} /></span>Expected profit only
      </label>
      <div className="sort-controls">
        <SlidersHorizontal size={15} />
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort opportunities">
          {Object.entries(SORTS).map(([value, option]) => <option value={value} key={value}>{option.label}</option>)}
        </select>
        <button className="sort-button" type="button" onClick={() => setDirection((current) => current === 'desc' ? 'asc' : 'desc')}>
          {direction === 'desc' ? <ArrowDown size={15} /> : <ArrowUp size={15} />}{SORTS[sort].label}
        </button>
      </div>
    </section>
  );
}
