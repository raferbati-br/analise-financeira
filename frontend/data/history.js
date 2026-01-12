import { state } from '../state.js';

export async function fetchHistoryCached(symbol, range, interval) {
  const key = `${symbol}|${range}|${interval}`;
  if (state.historyCache.has(key)) {
    return state.historyCache.get(key);
  }
  const promise = (async () => {
    try {
      const resp = await fetch(
        `/api/history?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`
      );
      const data = await resp.json();
      if (!resp.ok || !data.result || !data.result.ok) {
        return { ok: false, error: data?.result?.error || data?.error || 'Falha' };
      }
      return { ok: true, history: data.result.history || [] };
    } catch (err) {
      return { ok: false, error: 'Erro de rede' };
    }
  })();
  state.historyCache.set(key, promise);
  return promise;
}
