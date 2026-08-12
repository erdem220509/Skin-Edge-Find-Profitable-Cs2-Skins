import { useEffect, useState } from 'react';

export function useOpportunities(settings) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async ({ force = false } = {}) => {
    setError('');
    force ? setRefreshing(true) : setLoading(true);
    try {
      if (force) await fetch('/api/refresh', { method: 'POST' });
      const response = await fetch(`/api/opportunities?${new URLSearchParams(settings)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || payload.error || 'Request failed');
      if (payload.opportunities?.some((item) => !item.opportunity || !item.market)) {
        throw new Error('The API server is running an older Skin Edge build. Restart npm run dev to load Opportunity Scores.');
      }
      setData(payload);
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

  return { data, error, loading, refreshing, loadData };
}
