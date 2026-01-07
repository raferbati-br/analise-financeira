import { toOhlcvPoints } from './utils.js';

export const RISK_LOOKBACK = 20;
export const TARGET_RR = 2;

// Calcula entrada, stop, alvo e RR simples.
export function computeRiskReward(history) {
  const points = toOhlcvPoints(history);
  if (points.length < RISK_LOOKBACK + 1) {
    return { ok: false, reason: 'Sem dados' };
  }

  const entry = points[points.length - 1].close;
  const recentLows = points.slice(points.length - RISK_LOOKBACK).map((p) => p.low);
  const stop = Math.min(...recentLows);
  if (!Number.isFinite(entry) || !Number.isFinite(stop) || entry <= stop) {
    return { ok: false, reason: 'Invalido' };
  }

  const risk = entry - stop;
  const target = entry + risk * TARGET_RR;
  const rr = (target - entry) / risk;
  const isGood = rr >= TARGET_RR;

  return {
    ok: true,
    entry,
    stop,
    target,
    rr,
    isGood
  };
}
