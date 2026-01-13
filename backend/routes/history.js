const { fetchHistory } = require('../services/brapiService');

async function handleHistory(url, sendJson) {
  const raw = url.searchParams.get('symbol') || url.searchParams.get('symbols') || '';
  const symbol = raw.split(',').map((s) => s.trim()).filter(Boolean)[0];
  const range = (url.searchParams.get('range') || '1mo').trim();
  const interval = (url.searchParams.get('interval') || '1d').trim();

  if (!symbol) {
    sendJson(400, { error: 'Informe symbol, ex: PETR4' });
    return;
  }

  try {
    const result = await fetchHistory(symbol, range, interval);
    sendJson(200, { symbol, range, interval, result });
  } catch (err) {
    sendJson(500, { error: 'Falha ao carregar historico', detail: String(err) });
  }
}

module.exports = { handleHistory };
