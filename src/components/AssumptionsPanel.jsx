import { ExternalLink, X } from 'lucide-react';

function SourceStatus({ source }) {
  return (
    <div className="source-status" title={source.error || undefined}>
      <span className={`status-dot status-${source.status}`} />
      <span>{source.label}</span>
      <strong>{source.records.toLocaleString()}</strong>
    </div>
  );
}

export function AssumptionsPanel({ settings, setSettings, meta, onClose }) {
  const update = (key, value) => setSettings((current) => ({ ...current, [key]: Number(value) }));

  return (
    <aside className="settings-panel" aria-label="Profit assumptions">
      <div className="panel-heading">
        <div><span className="eyebrow">Opportunity model</span><h2>Assumptions</h2></div>
        <button className="icon-button" type="button" onClick={onClose} title="Close settings"><X size={18} /></button>
      </div>
      {!settings.applyDeductions && <div className="settings-mode-note">Fee assumptions are saved but not applied while Gross spread is selected.</div>}
      {settings.exitMarket === 'csfloat' ? (
        <div className="setting-group">
          <label htmlFor="sale-fee"><span>CSFloat sale fee</span><output>{settings.saleFee}%</output></label>
          <input id="sale-fee" type="range" min="0" max="5" step="0.25" value={settings.saleFee} onChange={(event) => update('saleFee', event.target.value)} />
        </div>
      ) : <div className="fixed-fee-note"><strong>Steam fees: 5% + 10%</strong><span>Uses Steam and CS2 minimum-cent rounding.</span></div>}
      <div className="setting-group">
        <label htmlFor="risk-buffer"><span>7-day risk buffer</span><output>{settings.riskBuffer}%</output></label>
        <input id="risk-buffer" type="range" min="0" max="15" step="0.5" value={settings.riskBuffer} onChange={(event) => update('riskBuffer', event.target.value)} />
      </div>
      <div className="setting-group">
        <label htmlFor="purchase-fee"><span>Purchase / payment fee</span><output>{settings.purchaseFee}%</output></label>
        <input id="purchase-fee" type="range" min="0" max="10" step="0.25" value={settings.purchaseFee} onChange={(event) => update('purchaseFee', event.target.value)} />
      </div>
      {settings.exitMarket === 'steam' && (
        <div className="setting-group steam-setting">
          <label htmlFor="steam-wallet-rate"><span>Steam Wallet cash value</span><output>{settings.steamWalletRate}%</output></label>
          <input id="steam-wallet-rate" type="range" min="25" max="100" step="1" value={settings.steamWalletRate} onChange={(event) => update('steamWalletRate', event.target.value)} />
          <small>Steam proceeds cannot be withdrawn. Set how much one Wallet dollar is worth to you.</small>
        </div>
      )}
      {settings.exitMarket === 'csfloat' && (
        <div className="toggle-row">
          <div><strong>Cash out after sale</strong><span>Deduct a 2% withdrawal estimate</span></div>
          <button className={`switch ${settings.cashoutFee > 0 ? 'active' : ''}`} type="button" role="switch" aria-checked={settings.cashoutFee > 0} onClick={() => update('cashoutFee', settings.cashoutFee > 0 ? 0 : 2)}><span /></button>
        </div>
      )}
      <div className="formula-block">
        <span>How expected value works</span>
        <p>The live exit floor is capped by recent completed-sale medians. Items without sale evidence receive a conservative 15% haircut.</p>
      </div>
      <div className="source-list">
        <span className="eyebrow">Data sources</span>
        {meta?.sources?.map((source) => <SourceStatus key={source.id} source={source} />)}
      </div>
      <a className="method-link" href="https://github.com/erdem220509/Skin-Edge-Find-Profitable-Cs2-Skins#opportunity-score" target="_blank" rel="noreferrer">Scoring methodology <ExternalLink size={12} /></a>
    </aside>
  );
}
