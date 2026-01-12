import { computeSma, findSwingHigh, findSwingLow, toOhlcvPoints } from './utils.js';

export const VOLUME_LOOKBACK = 20;
export const VOLUME_MULTIPLIER = 1.5;
export const KEYLEVEL_LOOKBACK = 20;
export const KEYLEVEL_TOLERANCE = 0.005;

// Confirma sinal com volume acima da media.
export function confirmVolume(points) {
  const volumes = points.map((p) => p.volume).filter((v) => Number.isFinite(v) && v > 0);
  if (volumes.length < VOLUME_LOOKBACK + 1) return null;
  const lastVolume = volumes[volumes.length - 1];
  const avgVolume = computeSma(volumes, VOLUME_LOOKBACK);
  if (!avgVolume) return null;
  if (lastVolume >= avgVolume * VOLUME_MULTIPLIER) return 'Volume acima da media';
  return null;
}

// Confirma fechamento proximo de nivel importante.
export function confirmCloseAtKeyLevel(points) {
  if (points.length < KEYLEVEL_LOOKBACK + 1) return null;
  const closes = points.map((p) => p.close);
  const lastClose = closes[closes.length - 1];
  const high = findSwingHigh(closes, KEYLEVEL_LOOKBACK);
  const low = findSwingLow(closes, KEYLEVEL_LOOKBACK);
  const sma50 = computeSma(closes, 50);
  if (!high || !low || !lastClose) return null;
  const nearHigh = Math.abs(lastClose - high) / high <= KEYLEVEL_TOLERANCE;
  const nearLow = Math.abs(lastClose - low) / low <= KEYLEVEL_TOLERANCE;
  const nearSma = sma50 ? Math.abs(lastClose - sma50) / sma50 <= KEYLEVEL_TOLERANCE : false;
  if (nearHigh) return 'Fechamento no topo (20d)';
  if (nearLow) return 'Fechamento no fundo (20d)';
  if (nearSma) return 'Fechamento na MM50';
  return null;
}

// Agrega confirmacoes do sinal.
export function detectConfirmations(history) {
  const points = toOhlcvPoints(history);
  if (points.length < 5) return [];

  const confirmations = [confirmVolume(points), confirmCloseAtKeyLevel(points)].filter(Boolean);

  return confirmations;
}
