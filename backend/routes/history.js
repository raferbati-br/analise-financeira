const { fetchHistory } = require('../services/brapiService');
const { parseHistoryParams } = require('../utils/validate');

async function handleHistory(url, sendJson) {
  const { symbol, range, interval } = parseHistoryParams(url);

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
