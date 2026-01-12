import { formatNumber, formatPrice } from './format.js';

function renderLogoCell(symbol, logo) {
  if (logo) {
    return `<img class="table-logo" src="${logo}" alt="Logo ${symbol}" loading="lazy" />`;
  }
  const initials = symbol ? symbol.slice(0, 2) : '--';
  return `<div class="table-logo placeholder">${initials}</div>`;
}

function formatPercent(value) {
  if (value === null || value === undefined) return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return `${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function getVariation(quote) {
  const open = quote?.open;
  const close = quote?.close;
  if (!open || close === undefined || close === null) return null;
  return ((close - open) / open) * 100;
}

function renderVariation(value) {
  if (value === null || value === undefined) {
    return '<span class="variation neutral">-</span>';
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return '<span class="variation neutral">-</span>';
  }
  const direction = num >= 0 ? 'up' : 'down';
  const arrow = num >= 0 ? '↗' : '↘';
  return `<span class="variation ${direction}">${arrow} ${formatPercent(num)}</span>`;
}

export function renderRows(tbody, symbols, analysisCache) {
  tbody.innerHTML = '';

  symbols.forEach((symbol) => {
    const row = document.createElement('tr');
    row.classList.add('table-row');
    row.dataset.symbol = symbol || '';
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    const analysis = analysisCache.get(symbol);
    if (!analysis || !analysis.ok) {
      row.innerHTML = `
        <td class="logo-cell">${renderLogoCell(symbol, null)}</td>
        <td>${symbol || '-'}</td>
        <td colspan="4" class="muted">Sem dados</td>
      `;
      tbody.appendChild(row);
      return;
    }

    const quote = analysis.quote || {};
    const variation = getVariation(quote);
    const score = analysis.score || { total: 0 };
    const logo = analysis.logo || null;

    row.innerHTML = `
      <td class="logo-cell">${renderLogoCell(symbol, logo)}</td>
      <td class="table-ticker">${symbol}</td>
      <td>${formatPrice(quote.close)}</td>
      <td>${renderVariation(variation)}</td>
      <td>${formatNumber(quote.volume)}</td>
      <td><span class="summary-text">${score.total}%</span></td>
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

function getSortValue(symbol, analysisCache, sortKey) {
  const data = analysisCache.get(symbol);
  if (!data || !data.ok) return null;
  const quote = data.quote || {};

  switch (sortKey) {
    case 'ticker':
      return symbol;
    case 'ultimo':
      return typeof quote.close === 'number' ? quote.close : null;
    case 'variacao':
      return getVariation(quote);
    case 'volume':
      return typeof quote.volume === 'number' ? quote.volume : null;
    case 'score':
      return getScoreValue(symbol, analysisCache);
    default:
      return symbol;
  }
}

function compareValues(a, b, sortDir) {
  const isNumA = typeof a === 'number';
  const isNumB = typeof b === 'number';
  const dir = sortDir === 'asc' ? 1 : -1;

  if (isNumA || isNumB) {
    if (a === null || a === undefined || Number.isNaN(a)) return 1;
    if (b === null || b === undefined || Number.isNaN(b)) return -1;
    if (a === b) return 0;
    return a > b ? dir : -dir;
  }

  const textA = (a || '').toString().toLowerCase();
  const textB = (b || '').toString().toLowerCase();
  if (!textA && !textB) return 0;
  if (!textA) return 1;
  if (!textB) return -1;
  if (textA === textB) return 0;
  return textA > textB ? dir : -dir;
}

function getSortedTickers(tickers, analysisCache, sortKey, sortDir) {
  const sorted = tickers.slice();
  if (!sortKey) return sorted;

  sorted.sort((a, b) => {
    const valueA = getSortValue(a, analysisCache, sortKey);
    const valueB = getSortValue(b, analysisCache, sortKey);
    const diff = compareValues(valueA, valueB, sortDir);
    if (diff !== 0) return diff;
    return a.localeCompare(b);
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
