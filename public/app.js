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
const historyBody = document.getElementById('history-body');
const historyRange = document.getElementById('history-range');
let historySymbol = '';
const TREND_RANGE = '1mo';
const TREND_INTERVAL = '1d';
const TREND_THRESHOLD = 0.02;
const TREND_MIN_POINTS = 5;

function showStatus(message) {
  statusEl.textContent = message;
  statusCard.hidden = false;
}

function clearStatus() {
  statusEl.textContent = '';
  statusCard.hidden = true;
}

let tickers = [];

function formatNumber(value) {
  if (!value || value === 'N/A') return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString('pt-BR');
}

function formatPrice(value) {
  if (!value || value === 'N/A') return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderRows(results) {
  tbody.innerHTML = '';

  results.forEach((item) => {
    const row = document.createElement('tr');
    if (!item.ok) {
      row.innerHTML = `
        <td>${item.symbol || '-'}</td>
        <td colspan="8" class="muted">${item.error}</td>
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
  });
}

function computeTrend(history) {
  const points = history
    .map((item) => ({
      date: item.date,
      close: Number(item.close ?? item.adjustedClose)
    }))
    .filter((item) => Number.isFinite(item.close) && item.close > 0 && Number.isFinite(item.date))
    .sort((a, b) => a.date - b.date);

  if (points.length < TREND_MIN_POINTS) {
    return { label: 'Indefinido', change: 0 };
  }

  const first = points[0].close;
  const last = points[points.length - 1].close;
  const change = (last - first) / first;

  if (change > TREND_THRESHOLD) return { label: 'Alta', change };
  if (change < -TREND_THRESHOLD) return { label: 'Baixa', change };
  return { label: 'Lateral', change };
}

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

function renderHistory(symbol, history) {
  historyTitle.textContent = `Historico - ${symbol}`;
  historyBody.innerHTML = '';
  const trend = computeTrend(history || []);
  historyTrend.textContent = `Tendencia: ${trend.label}`;
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

function populateOptions(list) {
  tickerSelect.innerHTML = '';
  list.forEach((ticker) => {
    const option = document.createElement('option');
    option.value = ticker;
    option.textContent = ticker;
    tickerSelect.appendChild(option);
  });
}

function filterTickers(query) {
  const text = query.trim().toUpperCase();
  if (!text) return tickers;
  return tickers.filter((ticker) => ticker.includes(text));
}

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
