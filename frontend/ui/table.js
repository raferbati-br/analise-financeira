import {
  formatBadge,
  formatBadges,
  formatNumber,
  formatPrice,
  formatTextBadge
} from './format.js';

export function renderRows(tbody, symbols, analysisCache) {
  tbody.innerHTML = '';

  symbols.forEach((symbol) => {
    const row = document.createElement('tr');
    const analysis = analysisCache.get(symbol);
    if (!analysis || !analysis.ok) {
      row.innerHTML = `
        <td>${symbol || '-'}</td>
        <td colspan="11" class="muted">Sem dados</td>
      `;
      tbody.appendChild(row);
      return;
    }

    const quote = analysis.quote || {};
    const dateTime = quote.timestamp ? new Date(quote.timestamp).toLocaleString('pt-BR') : '-';
    const trendLabel = analysis.trend?.label || 'Indefinido';
    const setups = analysis.setups || [];
    const confirmations = analysis.confirmations || [];
    const score = analysis.score || { total: 0 };
    const risk = analysis.risk || { ok: false };
    const levels = analysis.levels || { ok: false };

    const riskBadges = risk.ok && levels.ok
      ? `<div class="badge-row">` +
        `${formatBadge('Entrada', risk.entry)}` +
        `${formatBadge('Stop', risk.stop)}` +
        `${formatTextBadge(`RR ${risk.rr.toFixed(2)}`)}` +
        `${formatTextBadge(risk.isGood ? 'Compensa' : 'Nao compensa')}` +
        `${formatBadge('Rompe acima', levels.breakoutHigh)}` +
        `${formatBadge('Rompe abaixo', levels.breakoutLow)}` +
        `${formatBadge('Invalidacao', levels.invalidation)}` +
        `</div>`
      : `<span class="badge muted">Sem calculo</span>`;

    row.innerHTML = `
      <td>${symbol}</td>
      <td>${formatPrice(quote.close)}</td>
      <td>${formatPrice(quote.open)}</td>
      <td>${formatPrice(quote.low)}</td>
      <td>${formatPrice(quote.high)}</td>
      <td>${formatNumber(quote.volume)}</td>
      <td>${dateTime}</td>
      <td><div class="badge-row">${formatBadges([trendLabel], 'Indefinido')}</div></td>
      <td><div class="badge-row">${formatBadges(setups, 'Sem setup')}</div></td>
      <td><div class="badge-row">${formatBadges(confirmations, 'Sem confirmacao')}</div></td>
      <td>${riskBadges}</td>
      <td><div class="badge-row"><span class="badge">${score.total}%</span></div></td>
    `;
    tbody.appendChild(row);
  });
}

export function getFilteredTickers(tickers, filter) {
  const text = filter.trim().toUpperCase();
  if (!text) return tickers;
  return tickers.filter((ticker) => ticker.includes(text));
}

export function renderTablePage(
  tbody,
  pageInfo,
  pagePrev,
  pageNext,
  tickers,
  analysisCache,
  pageSize,
  page,
  filter
) {
  const filtered = getFilteredTickers(tickers, filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const pageTickers = filtered.slice(start, start + pageSize);
  renderRows(tbody, pageTickers, analysisCache);
  if (pageInfo) {
    pageInfo.textContent = `Pagina ${safePage} de ${totalPages} (${filtered.length} tickers)`;
  }
  if (pagePrev) pagePrev.disabled = safePage === 1;
  if (pageNext) pageNext.disabled = safePage === totalPages;
  return { page: safePage, totalPages };
}
