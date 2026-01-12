import {
  formatBadge,
  formatBadges,
  formatNumber,
  formatPrice,
  formatTextBadge
} from './format.js';

function renderLogoCell(symbol, logo) {
  if (logo) {
    return `<img class="table-logo" src="${logo}" alt="Logo ${symbol}" loading="lazy" />`;
  }
  const initials = symbol ? symbol.slice(0, 2) : '--';
  return `<div class="table-logo placeholder">${initials}</div>`;
}

export function renderRows(tbody, symbols, analysisCache) {
  tbody.innerHTML = '';

  symbols.forEach((symbol) => {
    const row = document.createElement('tr');
    const analysis = analysisCache.get(symbol);
    if (!analysis || !analysis.ok) {
      row.innerHTML = `
        <td class="logo-cell">${renderLogoCell(symbol, null)}</td>
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
    const logo = analysis.logo || null;

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
      <td class="logo-cell">${renderLogoCell(symbol, logo)}</td>
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

function getScoreValue(symbol, analysisCache) {
  const data = analysisCache.get(symbol);
  if (!data || !data.ok) return null;
  const total = data.score?.total;
  if (typeof total !== 'number' || Number.isNaN(total)) return null;
  return total;
}

function getSortedTickers(tickers, analysisCache, sortKey, sortDir) {
  const sorted = tickers.slice();
  if (!sortKey) return sorted;

  sorted.sort((a, b) => {
    if (sortKey === 'score') {
      const scoreA = getScoreValue(a, analysisCache);
      const scoreB = getScoreValue(b, analysisCache);
      const hasA = scoreA !== null;
      const hasB = scoreB !== null;
      if (!hasA && !hasB) return a.localeCompare(b);
      if (!hasA) return 1;
      if (!hasB) return -1;
      const diff = sortDir === 'asc' ? scoreA - scoreB : scoreB - scoreA;
      if (diff !== 0) return diff;
      return a.localeCompare(b);
    }

    const comp = a.localeCompare(b);
    return sortDir === 'asc' ? comp : -comp;
  });

  return sorted;
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
  filter,
  sortKey,
  sortDir
) {
  const filtered = getFilteredTickers(tickers, filter);
  const sorted = getSortedTickers(filtered, analysisCache, sortKey, sortDir);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const pageTickers = sorted.slice(start, start + pageSize);
  renderRows(tbody, pageTickers, analysisCache);
  if (pageInfo) {
    pageInfo.textContent = `Pagina ${safePage} de ${totalPages} (${filtered.length} tickers)`;
  }
  if (pagePrev) pagePrev.disabled = safePage === 1;
  if (pageNext) pageNext.disabled = safePage === totalPages;
  return { page: safePage, totalPages };
}
