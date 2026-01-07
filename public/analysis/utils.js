// Calcula media movel simples.
export function computeSma(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(values.length - period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return sum / period;
}

// Busca a maxima no periodo.
export function findSwingHigh(values, lookback) {
  if (values.length < lookback) return null;
  return Math.max(...values.slice(values.length - lookback));
}

// Busca a minima no periodo.
export function findSwingLow(values, lookback) {
  if (values.length < lookback) return null;
  return Math.min(...values.slice(values.length - lookback));
}

// Normaliza historico para pontos de fechamento.
export function toClosePoints(history) {
  return history
    .map((item) => ({
      date: item.date,
      close: Number(item.close ?? item.adjustedClose)
    }))
    .filter((item) => Number.isFinite(item.close) && Number.isFinite(item.date))
    .sort((a, b) => a.date - b.date);
}

// Normaliza historico para pontos OHLCV.
export function toOhlcvPoints(history) {
  return history
    .map((item) => ({
      date: item.date,
      close: Number(item.close ?? item.adjustedClose),
      open: Number(item.open),
      high: Number(item.high),
      low: Number(item.low),
      volume: Number(item.volume)
    }))
    .filter(
      (item) =>
        Number.isFinite(item.close) &&
        Number.isFinite(item.open) &&
        Number.isFinite(item.high) &&
        Number.isFinite(item.low) &&
        Number.isFinite(item.volume) &&
        Number.isFinite(item.date)
    )
    .sort((a, b) => a.date - b.date);
}
