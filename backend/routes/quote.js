const { fetchQuote } = require('../services/brapiService');
const { parseSymbols } = require('../utils/validate');

async function handleQuote(url, sendJson) {
  const raw = url.searchParams.get('symbols') || '';
  const symbols = parseSymbols(raw, 10);

  if (symbols.length === 0) {
    sendJson(400, { error: 'Informe symbols, ex: PETR4.SA,VALE3.SA' });
    return;
  }

  try {
    const results = await Promise.all(symbols.map(fetchQuote));
    sendJson(200, { symbols, results });
  } catch (err) {
    sendJson(500, { error: 'Falha ao consultar preco', detail: String(err) });
  }
}

module.exports = { handleQuote };
