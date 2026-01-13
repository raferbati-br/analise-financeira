import { state } from './state.js';
import { loadPersistedCache, applyPersistedCache, savePersistedCache } from './data/cache.js';
import { buildAnalysisForTickers } from './data/analysis.js';
import { renderSummaryFromAnalysis, renderSummaryLoading } from './ui/summary.js';
import { renderTablePage } from './ui/table.js';
import { debounce, formatNumber, formatPrice } from './ui/format.js';
import { showStatus, clearStatus } from './ui/status.js';
import { initTabs } from './ui/tabs.js';
import { apiUrl } from './api.js';

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
const tableUpdated = document.getElementById('table-updated');
const scorePanel = document.getElementById('score-panel');
const scorePanelBody = document.getElementById('score-panel-body');
const scorePanelTitle = document.getElementById('score-panel-title');
const scorePanelClose = document.getElementById('score-panel-close');
const tabs = document.querySelectorAll('[data-tab]');
const tabSummary = document.getElementById('tab-summary');
const tabGeneral = document.getElementById('tab-general');
const generalTabButton = document.querySelector('[data-tab="general"]');
const sortButtons = document.querySelectorAll('[data-sort]');

const SETUP_RANGE = '3mo';
const SETUP_INTERVAL = '1d';
const BUY_SCORE = 70;
const SELL_SCORE = 30;
const MIN_RR = 2;
const PAGE_SIZE = 25;

if (summaryLoading) {
  summaryLoading.hidden = true;
}
if (tableWrap) {
  tableWrap.hidden = true;
}

function formatPercentValue(value) {
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
  const arrow = num >= 0 ? '^' : 'v';
  return `<span class="variation ${direction}">${arrow} ${formatPercentValue(num)}</span>`;
}

function renderTags(items) {
  if (!items || !items.length) {
    return '<span class="muted">-</span>';
  }
  return `<div class="tag-list">${items.map((item) => `<span class="tag">${item}</span>`).join('')}</div>`;
}

function renderScorePanel(symbol) {
  if (!scorePanelBody || !scorePanelTitle) return;
  const data = state.analysisCache.get(symbol);
  if (!data || !data.ok) {
    scorePanelTitle.textContent = `${symbol || '-'} - Sem dados`;
    scorePanelBody.innerHTML = '<p class="muted">Sem dados suficientes para detalhar o score.</p>';
    return;
  }

  const score = data.score || { total: 0, breakdown: {} };
  const breakdown = score.breakdown || {};
  const trendLabel = data.trend?.label || 'Indefinido';
  const setups = data.setups || [];
  const confirmations = data.confirmations || [];
  const momentum = data.momentum;
  const name = data.name || '-';
  const risk = data.risk || { ok: false };
  const levels = data.levels || { ok: false };
  const quote = data.quote || {};
  const variation = getVariation(quote);
  const rrValue = risk.ok ? risk.rr.toFixed(2) : '-';
  const rrLabel = risk.ok ? (risk.isGood ? 'Compensa' : 'Nao compensa') : '-';
  const momentumLabel = momentum === null ? '-' : formatPercentValue(momentum * 100);

  scorePanelTitle.textContent = `${symbol} - ${name}`;
  scorePanelBody.innerHTML = `
    <div class="score-panel-summary">
      <div class="score-panel-score">
        <span class="score-panel-score-label">Score</span>
        <span class="score-panel-score-value">${score.total}%</span>
      </div>
      <div class="score-panel-meta">
        <div><span class="muted">Ultimo</span> ${formatPrice(quote.close)}</div>
        <div><span class="muted">Variacao</span> ${renderVariation(variation)}</div>
        <div><span class="muted">Volume</span> ${formatNumber(quote.volume)}</div>
      </div>
    </div>
    <div class="score-panel-grid">
      <div class="score-panel-item">
        <h3>Tendencia</h3>
        <p class="score-panel-value">${trendLabel}</p>
        <p class="muted">Pontos: ${breakdown.trendScore ?? 0}</p>
      </div>
      <div class="score-panel-item">
        <h3>Setups</h3>
        <p class="score-panel-value">${setups.length ? `${setups.length} sinal(ais)` : 'Nenhum'}</p>
        <p class="muted">Pontos: ${breakdown.patternScore ?? 0}</p>
      </div>
      <div class="score-panel-item">
        <h3>Confirmacoes</h3>
        <p class="score-panel-value">${confirmations.length ? `${confirmations.length} sinal(ais)` : 'Nenhuma'}</p>
        <p class="muted">Pontos: ${breakdown.volumeScore ?? 0}</p>
      </div>
      <div class="score-panel-item">
        <h3>Momento</h3>
        <p class="score-panel-value">${momentumLabel}</p>
        <p class="muted">Pontos: ${breakdown.momentumScore ?? 0}</p>
      </div>
      <div class="score-panel-item">
        <h3>Risco/Retorno</h3>
        <p class="score-panel-value">RR ${rrValue}</p>
        <p class="muted">Pontos: ${breakdown.rrScore ?? 0}</p>
      </div>
    </div>
    <div class="score-panel-section">
      <h3>Setups encontrados</h3>
      ${renderTags(setups)}
    </div>
    <div class="score-panel-section">
      <h3>Confirmacoes de volume</h3>
      ${renderTags(confirmations)}
    </div>
    <div class="score-panel-section">
      <h3>Risco/Retorno detalhado</h3>
      <div class="score-panel-risk">
        <div><span class="muted">Entrada</span> ${formatPrice(risk.entry)}</div>
        <div><span class="muted">Stop</span> ${formatPrice(risk.stop)}</div>
        <div><span class="muted">Alvo</span> ${formatPrice(risk.target)}</div>
        <div><span class="muted">RR</span> ${rrValue}</div>
        <div><span class="muted">Classificacao</span> ${rrLabel}</div>
        <div><span class="muted">Rompe acima</span> ${formatPrice(levels.breakoutHigh)}</div>
        <div><span class="muted">Rompe abaixo</span> ${formatPrice(levels.breakoutLow)}</div>
        <div><span class="muted">Invalidacao</span> ${formatPrice(levels.invalidation)}</div>
      </div>
    </div>
  `;
}

function openScorePanel(symbol) {
  if (!scorePanel) return;
  renderScorePanel(symbol);
  scorePanel.hidden = false;
  scorePanel.setAttribute('aria-hidden', 'false');
  document.body.classList.add('panel-open');
}

function closeScorePanel() {
  if (!scorePanel) return;
  scorePanel.hidden = true;
  scorePanel.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('panel-open');
}

function enableGeneralTab() {
  if (generalTabButton) {
    generalTabButton.disabled = false;
  }
}

function renderSummary() {
  renderSummaryFromAnalysis(
    summaryBuy,
    summarySell,
    summaryHold,
    state.tickers,
    state.analysisCache,
    BUY_SCORE,
    SELL_SCORE,
    MIN_RR
  );
}

function renderTable(page) {
  const result = renderTablePage(
    tbody,
    pageInfo,
    pagePrev,
    pageNext,
    state.tickers,
    state.analysisCache,
    PAGE_SIZE,
    page,
    state.currentFilter,
    state.sortKey,
    state.sortDir
  );
  state.currentPage = result.page;
}

function renderLastUpdated() {
  if (!tableUpdated) return;
  let latest = null;
  state.analysisCache.forEach((data) => {
    if (!data || !data.ok) return;
    const ts = data.quote?.timestamp;
    if (typeof ts !== 'number') return;
    if (!latest || ts > latest) latest = ts;
  });
  const label = latest ? new Date(latest).toLocaleString('pt-BR') : '-';
  tableUpdated.textContent = `Atualizado em: ${label}`;
}

async function loadTickers() {
  showStatus(statusEl, statusCard, 'Carregando lista de acoes...');
  try {
    const resp = await fetch(apiUrl('/api/tickers'));
    const data = await resp.json();
    if (!resp.ok) {
      const detail = data.detail ? ` (${data.detail})` : '';
      showStatus(statusEl, statusCard, `${data.error || 'Falha ao carregar lista.'}${detail}`);
      return;
    }
    state.tickers = Array.isArray(data.results) ? data.results : [];
    state.tickers = state.tickers.filter((ticker) => !ticker.endsWith('F'));
    clearStatus(statusEl, statusCard);
  } catch (err) {
    showStatus(statusEl, statusCard, 'Erro de rede ao carregar lista de acoes.');
  }
}

async function loadSummaryAndTable() {
  if (summaryLoading) {
    summaryLoading.hidden = false;
  }
  renderSummaryLoading(summaryBuy, summarySell, summaryHold);

  try {
    await buildAnalysisForTickers(state.tickers, SETUP_RANGE, SETUP_INTERVAL);
    renderSummary();
    renderLastUpdated();
    savePersistedCache();
    renderTable(1);
    if (tableWrap) {
      tableWrap.hidden = false;
    }
    enableGeneralTab();
  } finally {
    if (summaryLoading) {
      summaryLoading.hidden = true;
    }
  }
}

function initFromCache(cache) {
  applyPersistedCache(cache);
  renderSummary();
  renderLastUpdated();
  renderTable(1);
  if (tableWrap) {
    tableWrap.hidden = false;
  }
  enableGeneralTab();
}

function initPagination() {
  if (pagePrev) {
    pagePrev.addEventListener('click', () => {
      renderTable(state.currentPage - 1);
    });
  }
  if (pageNext) {
    pageNext.addEventListener('click', () => {
      renderTable(state.currentPage + 1);
    });
  }
}

function updateSortButtons() {
  sortButtons.forEach((button) => {
    const key = button.dataset.sort;
    const active = key === state.sortKey;
    if (active) {
      button.dataset.dir = state.sortDir;
      button.setAttribute('aria-sort', state.sortDir === 'asc' ? 'ascending' : 'descending');
    } else {
      button.removeAttribute('data-dir');
      button.removeAttribute('aria-sort');
    }
  });
}

function initSorting() {
  if (!sortButtons.length) return;
  updateSortButtons();
  sortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.sort;
      if (!key) return;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = key;
        state.sortDir = 'asc';
      }
      updateSortButtons();
      renderTable(1);
    });
  });
}

function initFilter() {
  if (!tableFilter) return;
  const applyFilter = debounce(() => {
    state.currentFilter = tableFilter.value || '';
    renderTable(1);
  }, 250);
  tableFilter.addEventListener('input', applyFilter);
}

function initScorePanel() {
  if (scorePanelClose) {
    scorePanelClose.addEventListener('click', closeScorePanel);
  }
  if (scorePanel) {
    scorePanel.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.matches('[data-close="panel"]')) {
        closeScorePanel();
      }
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && scorePanel && !scorePanel.hidden) {
      closeScorePanel();
    }
  });
}

function initRowSelection() {
  if (!tbody) return;
  tbody.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const row = target.closest('tr[data-symbol]');
    if (!row) return;
    const symbol = row.dataset.symbol;
    if (symbol) openScorePanel(symbol);
  });
  tbody.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const row = target.closest('tr[data-symbol]');
    if (!row) return;
    const symbol = row.dataset.symbol;
    if (symbol) {
      event.preventDefault();
      openScorePanel(symbol);
    }
  });
}

function initSummarySelection() {
  const summaryLists = [summaryBuy, summarySell, summaryHold].filter(Boolean);
  if (!summaryLists.length) return;
  summaryLists.forEach((list) => {
    list.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const item = target.closest('li[data-symbol]');
      if (!item) return;
      const symbol = item.dataset.symbol;
      if (symbol) openScorePanel(symbol);
    });
    list.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const item = target.closest('li[data-symbol]');
      if (!item) return;
      const symbol = item.dataset.symbol;
      if (symbol) {
        event.preventDefault();
        openScorePanel(symbol);
      }
    });
  });
}

function initApp() {
  initTabs(tabs, tabSummary, tabGeneral);
  initPagination();
  initSorting();
  initFilter();
  initScorePanel();
  initRowSelection();
  initSummarySelection();

  const cached = loadPersistedCache();
  if (cached) {
    initFromCache(cached);
    return;
  }

  loadTickers().then(async () => {
    await loadSummaryAndTable();
  });
}

initApp();
