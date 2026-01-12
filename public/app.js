import { computeTrend } from './analysis/trend.js';
import { detectSetups } from './analysis/patterns.js';
import { detectConfirmations } from './analysis/volume.js';
import { computeLevels, computeRiskReward } from './analysis/risk.js';
import { computeScore } from './analysis/score.js';

const statusCard = document.getElementById('status-card');
const statusEl = document.getElementById('status');
const tableWrap = document.getElementById('table-wrap');
const tbody = document.getElementById('tbody');
const summaryBuy = document.getElementById('summary-buy');
const summarySell = document.getElementById('summary-sell');
const summaryHold = document.getElementById('summary-hold');
const summaryLoading = document.getElementById('summary-loading');
const tableFilter = document.getElementById('table-filter');
const pagePrev = document.getElementById('page-prev');
const pageNext = document.getElementById('page-next');
const pageInfo = document.getElementById('page-info');
const tabs = document.querySelectorAll('[data-tab]');
const tabSummary = document.getElementById('tab-summary');
const tabGeneral = document.getElementById('tab-general');
const generalTabButton = document.querySelector('[data-tab="general"]');

const SETUP_RANGE = '3mo';
const SETUP_INTERVAL = '1d';
const BUY_SCORE = 70;
const SELL_SCORE = 30;
const MIN_RR = 2;
const PAGE_SIZE = 25;
let currentPage = 1;
let currentFilter = '';

const historyCache = new Map();
const analysisCache = new Map();
const CACHE_KEY = 'financeiro-cache-v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let tickers = [];

if (summaryLoading) {
  summaryLoading.hidden = true;
}
if (tableWrap) {
  tableWrap.hidden = true;
}

// Mostra mensagem de status na tela.
function showStatus(message) {
  statusEl.textContent = message;
  statusCard.hidden = false;
}

// Limpa a mensagem de status.
function clearStatus() {
  statusEl.textContent = '';
  statusCard.hidden = true;
}

// Formata numero com separador local.
function formatNumber(value) {
  if (!value || value === 'N/A') return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString('pt-BR');
}

// Formata preco em pt-BR com 2 casas.
function formatPrice(value) {
  if (!value || value === 'N/A') return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Formata um badge simples de nivel.
function formatBadge(label, value) {
  return `<span class="badge"><strong>${label}</strong> ${formatPrice(value)}</span>`;
}

// Formata um badge de texto simples.
function formatTextBadge(text) {
  return `<span class="badge">${text}</span>`;
}

// Formata uma lista de badges de texto.
function formatBadges(items, emptyLabel) {
  if (!items || items.length === 0) {
    return `<span class="badge muted">${emptyLabel}</span>`;
  }
  return items.map((item) => `<span class="badge">${item}</span>`).join('');
}

// Aplica debounce para reduzir re-render.
function debounce(fn, waitMs) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

// Busca historico com cache simples por range/interval.
async function fetchHistoryCached(symbol, range, interval) {
  const key = `${symbol}|${range}|${interval}`;
  if (historyCache.has(key)) {
    return historyCache.get(key);
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
  historyCache.set(key, promise);
  return promise;
}

// Carrega cache persistido no localStorage.
function loadPersistedCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.tickers) || typeof data.ts !== 'number') return null;
    if (Date.now() - data.ts > CACHE_TTL_MS) return null;
    return data;
  } catch (err) {
    return null;
  }
}

// Salva cache no localStorage.
function savePersistedCache() {
  try {
    const payload = {
      ts: Date.now(),
      tickers,
      analysis: Object.fromEntries(analysisCache)
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    // Sem acao: storage pode estar cheio ou bloqueado.
  }
}

// Aplica cache carregado.
function applyPersistedCache(cache) {
  tickers = cache.tickers.slice();
  analysisCache.clear();
  Object.entries(cache.analysis || {}).forEach(([symbol, data]) => {
    analysisCache.set(symbol, data);
  });
  renderSummaryFromAnalysisCache();
  renderTablePage(1);
  if (summaryLoading) {
    summaryLoading.hidden = true;
  }
  if (generalTabButton) {
    generalTabButton.disabled = false;
  }
  if (tableWrap) {
    tableWrap.hidden = false;
  }
}

// Renderiza a tabela de cotacoes.
function renderRows(symbols) {
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

    row.innerHTML = `
      <td>${symbol}</td>
      <td>${formatPrice(quote.close)}</td>
      <td>${formatPrice(quote.open)}</td>
      <td>${formatPrice(quote.low)}</td>
      <td>${formatPrice(quote.high)}</td>
      <td>${formatNumber(quote.volume)}</td>
      <td>${dateTime || '-'}</td>
      <td class="trend muted">Calculando...</td>
      <td class="setups muted">Calculando...</td>
      <td class="confirmations muted">Calculando...</td>
      <td class="risk muted">Calculando...</td>
      <td class="score muted">Calculando...</td>
    `;
    tbody.appendChild(row);

    const trendCell = row.querySelector('.trend');
    if (trendCell) {
      updateTrendForSymbol(symbol, trendCell);
    }

    const setupCell = row.querySelector('.setups');
    if (setupCell) {
      updateSetupsForSymbol(symbol, setupCell);
    }

    const confirmationsCell = row.querySelector('.confirmations');
    if (confirmationsCell) {
      updateConfirmationsForSymbol(symbol, confirmationsCell);
    }

    const riskCell = row.querySelector('.risk');
    if (riskCell) {
      updateRiskForSymbol(symbol, riskCell);
    }

    const scoreCell = row.querySelector('.score');
    if (scoreCell) {
      updateScoreForSymbol(symbol, scoreCell);
    }
  });
}

// Carrega historico e atualiza tendencia.
async function updateTrendForSymbol(symbol, cell) {
  if (!symbol || !cell) return;
  cell.textContent = 'Calculando...';
  cell.classList.add('muted');

  try {
    const analysis = analysisCache.get(symbol);
    if (!analysis || !analysis.ok) {
      cell.textContent = 'Indefinido';
      return;
    }
    const trend = analysis.trend;
    cell.innerHTML = `<div class="badge-row">${formatBadges([trend.label], 'Indefinido')}</div>`;
    cell.classList.toggle('muted', trend.label === 'Indefinido');
  } catch (err) {
    cell.textContent = 'Indefinido';
  }
}

// Carrega historico e atualiza setups.
async function updateSetupsForSymbol(symbol, cell) {
  if (!symbol || !cell) return;
  cell.textContent = 'Calculando...';
  cell.classList.add('muted');

  try {
    const analysis = analysisCache.get(symbol);
    if (!analysis || !analysis.ok) {
      cell.textContent = 'Sem setup';
      return;
    }
    const setups = analysis.setups;
    cell.innerHTML = `<div class="badge-row">${formatBadges(setups, 'Sem setup')}</div>`;
    cell.classList.toggle('muted', setups.length === 0);
  } catch (err) {
    cell.textContent = 'Sem setup';
  }
}

// Carrega historico e atualiza confirmacoes.
async function updateConfirmationsForSymbol(symbol, cell) {
  if (!symbol || !cell) return;
  cell.textContent = 'Calculando...';
  cell.classList.add('muted');

  try {
    const analysis = analysisCache.get(symbol);
    if (!analysis || !analysis.ok) {
      cell.textContent = 'Sem confirmacao';
      return;
    }
    const confirmations = analysis.confirmations;
    cell.innerHTML = `<div class="badge-row">${formatBadges(confirmations, 'Sem confirmacao')}</div>`;
    cell.classList.toggle('muted', confirmations.length === 0);
  } catch (err) {
    cell.textContent = 'Sem confirmacao';
  }
}

// Carrega historico e atualiza risco/retorno.
async function updateRiskForSymbol(symbol, cell) {
  if (!symbol || !cell) return;
  cell.textContent = 'Calculando...';
  cell.classList.add('muted');

  try {
    const analysis = analysisCache.get(symbol);
    if (!analysis || !analysis.ok) {
      cell.textContent = 'Sem calculo';
      return;
    }
    const risk = analysis.risk;
    const levels = analysis.levels;
    if (!risk.ok || !levels.ok) {
      cell.textContent = 'Sem calculo';
      return;
    }
    const verdict = risk.isGood ? 'Compensa' : 'Nao compensa';
    cell.innerHTML =
      `<div class="badge-row">` +
      `${formatBadge('Entrada', risk.entry)}` +
      `${formatBadge('Stop', risk.stop)}` +
      `${formatTextBadge(`RR ${risk.rr.toFixed(2)}`)}` +
      `${formatTextBadge(verdict)}` +
      `${formatBadge('Rompe acima', levels.breakoutHigh)}` +
      `${formatBadge('Rompe abaixo', levels.breakoutLow)}` +
      `${formatBadge('Invalidacao', levels.invalidation)}` +
      `</div>`;
    cell.classList.toggle('muted', !risk.isGood);
  } catch (err) {
    cell.textContent = 'Sem calculo';
  }
}

// Carrega historico e atualiza score.
async function updateScoreForSymbol(symbol, cell) {
  if (!symbol || !cell) return;
  cell.textContent = 'Calculando...';
  cell.classList.add('muted');

  try {
    const analysis = analysisCache.get(symbol);
    if (!analysis || !analysis.ok) {
      cell.textContent = 'Sem score';
      return;
    }
    const score = analysis.score;
    cell.innerHTML = `<div class="badge-row"><span class="badge">${score.total}%</span></div>`;
    cell.classList.toggle('muted', score.total < 50);
  } catch (err) {
    cell.textContent = 'Sem score';
  }
}


// Carrega tickers do backend.
async function loadTickers() {
  showStatus('Carregando lista de acoes...');
  try {
    const resp = await fetch('/api/tickers');
    const data = await resp.json();
    if (!resp.ok) {
      const detail = data.detail ? ` (${data.detail})` : '';
      showStatus(`${data.error || 'Falha ao carregar lista.'}${detail}`);
      return;
    }
    tickers = Array.isArray(data.results) ? data.results : [];
    tickers = tickers.filter((ticker) => !ticker.endsWith('F'));
    clearStatus();
  } catch (err) {
    showStatus('Erro de rede ao carregar lista de acoes.');
  }
}

function renderSummaryList(listEl, items, emptyLabel) {
  if (!items.length) {
    listEl.innerHTML = `<li class="summary-item muted">${emptyLabel}</li>`;
    return;
  }
  listEl.innerHTML = items
    .map(
      (item) =>
        `<li class="summary-item">` +
        `<span class="summary-ticker">${item.symbol}</span>` +
        `<div class="badge-row">` +
        `${formatTextBadge(`${item.score.total}%`)}` +
        `${formatTextBadge(item.trend.label)}` +
        `${formatTextBadge(`RR ${item.rr.toFixed(2)}`)}` +
        `</div>` +
        `</li>`
    )
    .join('');
}

function classifySignal(data) {
  if (data.score.total >= BUY_SCORE && data.trend.label === 'Alta' && data.rr >= MIN_RR) {
    return 'buy';
  }
  if (data.score.total <= SELL_SCORE && data.trend.label === 'Baixa' && data.rr >= MIN_RR) {
    return 'sell';
  }
  return 'hold';
}

async function loadSummary() {
  if (summaryLoading) {
    summaryLoading.hidden = false;
  }
  renderSummaryList(summaryBuy, [], 'Carregando...');
  renderSummaryList(summarySell, [], 'Carregando...');
  renderSummaryList(summaryHold, [], 'Carregando...');

  try {
    await Promise.all(
      tickers.map(async (symbol) => {
        const data = await fetchHistoryCached(symbol, SETUP_RANGE, SETUP_INTERVAL);
        if (!data.ok) {
          analysisCache.set(symbol, { ok: false });
          return;
        }
        const history = data.history || [];
        const last = history[history.length - 1] || {};
        const quote = {
          open: last.open,
          high: last.high,
          low: last.low,
          close: last.close ?? last.adjustedClose,
          volume: last.volume,
          timestamp: last.date ? last.date * 1000 : null
        };
        const score = computeScore(history);
        const trend = computeTrend(history);
        const setups = detectSetups(history);
        const confirmations = detectConfirmations(history);
        const risk = computeRiskReward(history);
        const levels = computeLevels(history);
        const rr = risk.ok ? risk.rr : 0;
        analysisCache.set(symbol, {
          ok: true,
          score,
          trend,
          setups,
          confirmations,
          risk,
          levels,
          rr,
          quote
        });
      })
    );
    renderSummaryFromAnalysisCache();
    savePersistedCache();
    renderTablePage(1);
    if (tableWrap) {
      tableWrap.hidden = false;
    }
  } finally {
    if (summaryLoading) {
      summaryLoading.hidden = true;
    }
  }
}

function renderSummaryFromAnalysisCache() {
  const buy = [];
  const sell = [];
  const hold = [];

  tickers.forEach((symbol) => {
    const data = analysisCache.get(symbol);
    if (!data || !data.ok) {
      hold.push({
        symbol,
        score: { total: 0 },
        trend: { label: 'Indefinido' },
        rr: 0
      });
      return;
    }
    const item = { symbol, score: data.score, trend: data.trend, rr: data.rr };
    const bucket = classifySignal(item);
    if (bucket === 'buy') buy.push(item);
    else if (bucket === 'sell') sell.push(item);
    else hold.push(item);
  });

  buy.sort((a, b) => b.score.total - a.score.total);
  sell.sort((a, b) => a.score.total - b.score.total);
  hold.sort((a, b) => b.score.total - a.score.total);

  renderSummaryList(summaryBuy, buy.slice(0, 4), 'Sem sinais de compra');
  renderSummaryList(summarySell, sell.slice(0, 4), 'Sem sinais de venda');
  renderSummaryList(summaryHold, hold.slice(0, 4), 'Sem sinais para ficar fora');
}

function getFilteredTickers() {
  const text = currentFilter.trim().toUpperCase();
  if (!text) return tickers;
  return tickers.filter((ticker) => ticker.includes(text));
}

function renderTablePage(page) {
  const filtered = getFilteredTickers();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  currentPage = safePage;
  const start = (safePage - 1) * PAGE_SIZE;
  const pageTickers = filtered.slice(start, start + PAGE_SIZE);
  renderRows(pageTickers);
  if (pageInfo) {
    pageInfo.textContent = `Pagina ${safePage} de ${totalPages} (${filtered.length} tickers)`;
  }
  if (pagePrev) pagePrev.disabled = safePage === 1;
  if (pageNext) pageNext.disabled = safePage === totalPages;
}

const cached = loadPersistedCache();
if (cached) {
  applyPersistedCache(cached);
} else {
  loadTickers().then(async () => {
    await loadSummary();
    renderTablePage(1);
    if (generalTabButton) {
      generalTabButton.disabled = false;
    }
    if (tableWrap) {
      tableWrap.hidden = false;
    }
  });
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    tabs.forEach((btn) => btn.classList.remove('active'));
    tab.classList.add('active');
    if (target === 'summary') {
      tabSummary.hidden = false;
      tabGeneral.hidden = true;
    } else {
      tabSummary.hidden = true;
      tabGeneral.hidden = false;
    }
  });
});

if (pagePrev) {
  pagePrev.addEventListener('click', () => {
    renderTablePage(currentPage - 1);
  });
}

if (pageNext) {
  pageNext.addEventListener('click', () => {
    renderTablePage(currentPage + 1);
  });
}

if (tableFilter) {
  const applyFilter = debounce(() => {
    currentFilter = tableFilter.value || '';
    renderTablePage(1);
  }, 250);
  tableFilter.addEventListener('input', applyFilter);
}
