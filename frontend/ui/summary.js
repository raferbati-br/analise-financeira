import { formatTextBadge } from './format.js';

function renderLogo(item) {
  if (item.logo) {
    return `<img class="summary-logo" src="${item.logo}" alt="Logo ${item.symbol}" loading="lazy" />`;
  }
  const initials = item.symbol ? item.symbol.slice(0, 2) : '--';
  return `<div class="summary-logo placeholder">${initials}</div>`;
}

export function renderSummaryList(listEl, items, emptyLabel) {
  if (!items.length) {
    listEl.innerHTML = `<li class="summary-item muted">${emptyLabel}</li>`;
    return;
  }
  listEl.innerHTML = items
    .map(
      (item) =>
        `<li class="summary-item">` +
        `<div class="summary-header">` +
        `${renderLogo(item)}` +
        `<span class="summary-ticker">${item.symbol}</span>` +
        `</div>` +
        `<div class="badge-row">` +
        `${formatTextBadge(`${item.score.total}%`)}` +
        `${formatTextBadge(item.trend.label)}` +
        `${formatTextBadge(`RR ${item.rr.toFixed(2)}`)}` +
        `</div>` +
        `</li>`
    )
    .join('');
}

export function renderSummaryLoading(summaryBuy, summarySell, summaryHold) {
  renderSummaryList(summaryBuy, [], 'Carregando...');
  renderSummaryList(summarySell, [], 'Carregando...');
  renderSummaryList(summaryHold, [], 'Carregando...');
}

export function renderSummaryFromAnalysis(
  summaryBuy,
  summarySell,
  summaryHold,
  tickers,
  analysisCache,
  buyScore,
  sellScore,
  minRr
) {
  const buy = [];
  const sell = [];
  const hold = [];

  tickers.forEach((symbol) => {
    const data = analysisCache.get(symbol);
    if (!data || !data.ok) {
      hold.push({
        symbol,
        logo: null,
        score: { total: 0 },
        trend: { label: 'Indefinido' },
        rr: 0
      });
      return;
    }
    const item = { symbol, logo: data.logo, score: data.score, trend: data.trend, rr: data.rr };
    if (item.score.total >= buyScore && item.trend.label === 'Alta' && item.rr >= minRr) {
      buy.push(item);
    } else if (item.score.total <= sellScore && item.trend.label === 'Baixa' && item.rr >= minRr) {
      sell.push(item);
    } else {
      hold.push(item);
    }
  });

  buy.sort((a, b) => b.score.total - a.score.total);
  sell.sort((a, b) => a.score.total - b.score.total);
  hold.sort((a, b) => b.score.total - a.score.total);

  renderSummaryList(summaryBuy, buy.slice(0, 4), 'Sem sinais de compra');
  renderSummaryList(summarySell, sell.slice(0, 4), 'Sem sinais de venda');
  renderSummaryList(summaryHold, hold.slice(0, 4), 'Sem sinais para ficar fora');
}
