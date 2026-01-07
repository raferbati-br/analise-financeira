import { toClosePoints } from './utils.js';

export const TREND_THRESHOLD = 0.02;
export const TREND_MIN_POINTS = 5;

// Calcula tendencia simples a partir do historico.
export function computeTrend(history) {
  const points = toClosePoints(history);
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
