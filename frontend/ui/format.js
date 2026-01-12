export function formatNumber(value) {
  if (!value || value === 'N/A') return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString('pt-BR');
}

export function formatPrice(value) {
  if (!value || value === 'N/A') return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatBadge(label, value) {
  return `<span class="badge"><strong>${label}</strong> ${formatPrice(value)}</span>`;
}

export function formatTextBadge(text) {
  return `<span class="badge">${text}</span>`;
}

export function formatBadges(items, emptyLabel) {
  if (!items || items.length === 0) {
    return `<span class="badge muted">${emptyLabel}</span>`;
  }
  return items.map((item) => `<span class="badge">${item}</span>`).join('');
}

export function debounce(fn, waitMs) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}
