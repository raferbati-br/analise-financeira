import { computeTrend } from './analysis/trend.js';
import { detectSetups } from './analysis/patterns.js';
import { detectConfirmations } from './analysis/volume.js';
import { computeRiskReward } from './analysis/risk.js';
import { computeScore } from './analysis/score.js';

const form = document.getElementById('quote-form');
const filterInput = document.getElementById('ticker-filter');
const tickerSelect = document.getElementById('ticker-select');
const clearButton = document.getElementById('clear-selection');
const statusCard = document.getElementById('status-card');
const statusEl = document.getElementById('status');
const tableWrap = document.getElementById('table-wrap');
const tbody = document.getElementById('tbody');
const historyCard = document.getElementById('history-card');
const historyTitle = document.getElementById('history-title');
const historyTrend = document.getElementById('history-trend');
const historySetups = document.getElementById('history-setups');
const historyConfirmations = document.getElementById('history-confirmations');
const historyRisk = document.getElementById('history-risk');
const historyScore = document.getElementById('history-score');
const historyBody = document.getElementById('history-body');
const historyRange = document.getElementById('history-range');
let historySymbol = '';
const TREND_RANGE = '1mo';
const TREND_INTERVAL = '1d';
const SETUP_RANGE = '3mo';
const SETUP_INTERVAL = '1d';

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

let tickers = [];

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

// Renderiza a tabela de cotacoes.
function renderRows(results) {
  tbody.innerHTML = '';

  results.forEach((item) => {
    const row = document.createElement('tr');
    if (!item.ok) {
      row.innerHTML = `
        <td>${item.symbol || '-'}</td>
        <td colspan="12" class="muted">${item.error}</td>
      `;
      tbody.appendChild(row);
      return;
    }

    const dateTime = item.timestamp
      ? new Date(item.timestamp).toLocaleString('pt-BR')
      : `${item.date || ''} ${item.time || ''}`.trim();

    row.innerHTML = `
      <td>${item.symbol}</td>
      <td>${formatPrice(item.close)}</td>
      <td>${formatPrice(item.open)}</td>
      <td>${formatPrice(item.low)}</td>
      <td>${formatPrice(item.high)}</td>
      <td>${formatNumber(item.volume)}</td>
      <td>${dateTime || '-'}</td>
      <td class="trend muted">Calculando...</td>
      <td class="setups muted">Calculando...</td>
      <td class="confirmations muted">Calculando...</td>
      <td class="risk muted">Calculando...</td>
      <td class="score muted">Calculando...</td>
      <td>
        <button type="button" class="ghost small" data-action="history" data-symbol="${item.symbol}">
          Historico
        </button>
      </td>
    `;
    tbody.appendChild(row);

    const trendCell = row.querySelector('.trend');
    if (trendCell) {
      updateTrendForSymbol(item.symbol, trendCell);
    }

    const setupCell = row.querySelector('.setups');
    if (setupCell) {
      updateSetupsForSymbol(item.symbol, setupCell);
    }

    const confirmationsCell = row.querySelector('.confirmations');
    if (confirmationsCell) {
      updateConfirmationsForSymbol(item.symbol, confirmationsCell);
    }

    const riskCell = row.querySelector('.risk');
    if (riskCell) {
      updateRiskForSymbol(item.symbol, riskCell);
    }

    const scoreCell = row.querySelector('.score');
    if (scoreCell) {
      updateScoreForSymbol(item.symbol, scoreCell);
    }
  });
}

// Carrega historico e atualiza tendencia.
async function updateTrendForSymbol(symbol, cell) {
  if (!symbol || !cell) return;
  cell.textContent = 'Calculando...';
  cell.classList.add('muted');

  try {
    const resp = await fetch(
      `/api/history?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(TREND_RANGE)}&interval=${encodeURIComponent(TREND_INTERVAL)}`
    );
    const data = await resp.json();
    if (!resp.ok || !data.result || !data.result.ok) {
      cell.textContent = 'Indefinido';
      return;
    }
    const trend = computeTrend(data.result.history || []);
    cell.textContent = trend.label;
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
    const resp = await fetch(
      `/api/history?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(SETUP_RANGE)}&interval=${encodeURIComponent(SETUP_INTERVAL)}`
    );
    const data = await resp.json();
    if (!resp.ok || !data.result || !data.result.ok) {
      cell.textContent = 'Sem setup';
      return;
    }
    const setups = detectSetups(data.result.history || []);
    cell.textContent = setups.length ? setups.join(' + ') : 'Sem setup';
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
    const resp = await fetch(
      `/api/history?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(SETUP_RANGE)}&interval=${encodeURIComponent(SETUP_INTERVAL)}`
    );
    const data = await resp.json();
    if (!resp.ok || !data.result || !data.result.ok) {
      cell.textContent = 'Sem confirmacao';
      return;
    }
    const confirmations = detectConfirmations(data.result.history || []);
    cell.textContent = confirmations.length ? confirmations.join(' + ') : 'Sem confirmacao';
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
    const resp = await fetch(
      `/api/history?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(SETUP_RANGE)}&interval=${encodeURIComponent(SETUP_INTERVAL)}`
    );
    const data = await resp.json();
    if (!resp.ok || !data.result || !data.result.ok) {
      cell.textContent = 'Sem calculo';
      return;
    }
    const risk = computeRiskReward(data.result.history || []);
    if (!risk.ok) {
      cell.textContent = 'Sem calculo';
      return;
    }
    const verdict = risk.isGood ? 'Compensa' : 'Nao compensa';
    cell.textContent = `Entrada ${formatPrice(risk.entry)} | Stop ${formatPrice(risk.stop)} | RR ${risk.rr.toFixed(2)} | ${verdict}`;
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
    const resp = await fetch(
      `/api/history?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(SETUP_RANGE)}&interval=${encodeURIComponent(SETUP_INTERVAL)}`
    );
    const data = await resp.json();
    if (!resp.ok || !data.result || !data.result.ok) {
      cell.textContent = 'Sem score';
      return;
    }
    const score = computeScore(data.result.history || []);
    cell.textContent = `${score.total}/100`;
    cell.classList.toggle('muted', score.total < 50);
  } catch (err) {
    cell.textContent = 'Sem score';
  }
}

// Renderiza historico e resumo.
function renderHistory(symbol, history) {
  historyTitle.textContent = `Historico - ${symbol}`;
  historyBody.innerHTML = '';
  const trend = computeTrend(history || []);
  historyTrend.textContent = `Tendencia: ${trend.label}`;
  const setups = detectSetups(history || []);
  historySetups.textContent = `Setups: ${setups.length ? setups.join(' + ') : 'Sem setup'}`;
  const confirmations = detectConfirmations(history || []);
  historyConfirmations.textContent = `Confirmacoes: ${confirmations.length ? confirmations.join(' + ') : 'Sem confirmacao'}`;
  const risk = computeRiskReward(history || []);
  historyRisk.textContent = risk.ok
    ? `Entrada ${formatPrice(risk.entry)} | Stop ${formatPrice(risk.stop)} | Alvo ${formatPrice(risk.target)} | RR ${risk.rr.toFixed(2)} | ${risk.isGood ? 'Compensa' : 'Nao compensa'}`
    : 'Risco/Retorno: sem calculo';
  const score = computeScore(history || []);
  historyScore.textContent = `Score: ${score.total}/100 (T ${score.breakdown.trendScore}, P ${score.breakdown.patternScore}, V ${score.breakdown.volumeScore}, M ${score.breakdown.momentumScore}, RR ${score.breakdown.rrScore})`;
  if (!history || history.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="6" class="muted">Sem dados de historico.</td>';
    historyBody.appendChild(row);
    historyCard.hidden = false;
    return;
  }

  history
    .slice()
    .sort((a, b) => (b.date || 0) - (a.date || 0))
    .forEach((point) => {
      const row = document.createElement('tr');
      const date = point.date ? new Date(point.date * 1000).toLocaleDateString('pt-BR') : '-';
      row.innerHTML = `
        <td>${date}</td>
        <td>${formatPrice(point.open)}</td>
        <td>${formatPrice(point.low)}</td>
        <td>${formatPrice(point.high)}</td>
        <td>${formatPrice(point.close)}</td>
        <td>${formatNumber(point.volume)}</td>
      `;
      historyBody.appendChild(row);
    });
  historyCard.hidden = false;
}

// Busca historico do ativo.
async function loadHistory(symbol) {
  historySymbol = symbol;
  showStatus(`Carregando historico de ${symbol}...`);
  historyCard.hidden = true;

  try {
    const range = historyRange.value || '1mo';
    const resp = await fetch(
      `/api/history?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}&interval=1d`
    );
    const data = await resp.json();
    if (!resp.ok || !data.result || !data.result.ok) {
      const errorMsg = data?.result?.error || data?.error || 'Falha ao carregar historico.';
      showStatus(errorMsg);
      return;
    }
    clearStatus();
    renderHistory(data.result.symbol || symbol, data.result.history);
  } catch (err) {
    showStatus('Erro de rede ao carregar historico.');
  }
}

// Preenche a lista de tickers.
function populateOptions(list) {
  tickerSelect.innerHTML = '';
  list.forEach((ticker) => {
    const option = document.createElement('option');
    option.value = ticker;
    option.textContent = ticker;
    tickerSelect.appendChild(option);
  });
}

// Filtra tickers pela busca.
function filterTickers(query) {
  const text = query.trim().toUpperCase();
  if (!text) return tickers;
  return tickers.filter((ticker) => ticker.includes(text));
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
    populateOptions(tickers);
    clearStatus();
  } catch (err) {
    showStatus('Erro de rede ao carregar lista de acoes.');
  }
}

loadTickers();

filterInput.addEventListener('input', () => {
  populateOptions(filterTickers(filterInput.value));
});

clearButton.addEventListener('click', () => {
  filterInput.value = '';
  populateOptions(tickers);
  Array.from(tickerSelect.options).forEach((opt) => {
    opt.selected = false;
  });
  clearStatus();
  tableWrap.hidden = true;
  historyCard.hidden = true;
  historySymbol = '';
  historyTrend.textContent = '';
  historySetups.textContent = '';
  historyConfirmations.textContent = '';
  historyRisk.textContent = '';
  historyScore.textContent = '';
});

tbody.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.dataset.action === 'history') {
    const symbol = target.dataset.symbol;
    if (symbol) {
      loadHistory(symbol);
    }
  }
});

historyRange.addEventListener('change', () => {
  if (historySymbol) {
    loadHistory(historySymbol);
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearStatus();
  tableWrap.hidden = true;

  const selected = Array.from(tickerSelect.selectedOptions).map((opt) => opt.value);
  if (selected.length === 0) {
    showStatus('Selecione ao menos uma acao.');
    return;
  }

  showStatus('Consultando...');

  try {
    const resp = await fetch(`/api/quote?symbols=${encodeURIComponent(selected.join(','))}`);
    const data = await resp.json();

    if (!resp.ok) {
      showStatus(data.error || 'Falha na consulta.');
      return;
    }

    renderRows(data.results || []);
    statusCard.hidden = true;
    tableWrap.hidden = false;
    historyCard.hidden = true;
    historySymbol = '';
  } catch (err) {
    showStatus('Erro de rede ao consultar preco.');
  }
});
