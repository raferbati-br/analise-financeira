import { toClosePoints } from './utils.js';

export const MOMENTUM_LOOKBACK = 14;

// Calcula momento do preco com base no retorno do periodo.
export function computeMomentum(history) {
  const points = toClosePoints(history);
  if (points.length < MOMENTUM_LOOKBACK + 1) return null;
  const recent = points[points.length - 1].close;
  const past = points[points.length - 1 - MOMENTUM_LOOKBACK].close;
  if (!Number.isFinite(recent) || !Number.isFinite(past) || past === 0) return null;
  return (recent - past) / past;
}
