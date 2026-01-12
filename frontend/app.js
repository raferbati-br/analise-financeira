import { state } from './state.js';
import { loadPersistedCache, applyPersistedCache, savePersistedCache } from './data/cache.js';
import { buildAnalysisForTickers } from './data/analysis.js';
import { renderSummaryFromAnalysis, renderSummaryLoading } from './ui/summary.js';
import { renderTablePage } from './ui/table.js';
import { debounce } from './ui/format.js';
import { showStatus, clearStatus } from './ui/status.js';
import { initTabs } from './ui/tabs.js';

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
    const resp = await fetch('/api/tickers');
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

function initApp() {
  initTabs(tabs, tabSummary, tabGeneral);
  initPagination();
  initSorting();
  initFilter();

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
