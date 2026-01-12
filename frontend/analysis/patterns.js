import { computeSma, findSwingHigh, findSwingLow, toOhlcvPoints } from './utils.js';

const SMA_FAST = 20;
const SMA_SLOW = 50;
const BREAKOUT_LOOKBACK = 20;

// Detecta pullback simples na tendencia.
export function detectPullbackInTrend(points) {
  const closes = points.map((p) => p.close);
  const sma20 = computeSma(closes, SMA_FAST);
  const sma50 = computeSma(closes, SMA_SLOW);
  if (!sma20 || !sma50) return null;
  const last = closes[closes.length - 1];
  const prev = closes[closes.length - 2];
  if (sma20 > sma50 && prev < sma20 && last > sma20) return 'Pullback em alta';
  if (sma20 < sma50 && prev > sma20 && last < sma20) return 'Pullback em baixa';
  return null;
}

// Detecta rompimento simples da faixa.
export function detectBreakout(points) {
  const closes = points.map((p) => p.close);
  const last = closes[closes.length - 1];
  const high20 = findSwingHigh(closes, BREAKOUT_LOOKBACK);
  const low20 = findSwingLow(closes, BREAKOUT_LOOKBACK);
  if (!high20 || !low20) return null;
  if (last > high20) return 'Rompimento de alta (20d)';
  if (last < low20) return 'Rompimento de baixa (20d)';
  return null;
}

// Detecta engolfo de reversao.
export function detectReversal(points) {
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  if (!last || !prev) return null;
  const bullishEngulf =
    prev.close < prev.open &&
    last.close > last.open &&
    last.open <= prev.close &&
    last.close >= prev.open;
  const bearishEngulf =
    prev.close > prev.open &&
    last.close < last.open &&
    last.open >= prev.close &&
    last.close <= prev.open;
  if (bullishEngulf) return 'Engolfo de alta';
  if (bearishEngulf) return 'Engolfo de baixa';
  return null;
}

// Agrega os setups detectados.
export function detectSetups(history) {
  const points = toOhlcvPoints(history);
  if (points.length < 5) return [];

  const setups = [
    detectPullbackInTrend(points),
    detectBreakout(points),
    detectReversal(points)
  ].filter(Boolean);

  return setups;
}
