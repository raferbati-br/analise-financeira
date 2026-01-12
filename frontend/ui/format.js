export function formatNumber(value) {
  if (value === null || value === undefined || value === 'N/A') return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  const abs = Math.abs(num);
  if (abs >= 1_000_000) {
    const scaled = num / 1_000_000;
    const text = scaled.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    });
    return `${text}M`;
  }
  if (abs >= 1_000) {
    const scaled = num / 1_000;
    const text = scaled.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    });
    return `${text}K`;
  }
  return num.toLocaleString('pt-BR');
}

export function formatPrice(value) {
  if (!value || value === 'N/A') return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function debounce(fn, waitMs) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}
