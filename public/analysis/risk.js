import { findSwingHigh, findSwingLow, toOhlcvPoints } from './utils.js';

export const RISK_LOOKBACK = 20;
export const TARGET_RR = 2;
const LEVEL_LOOKBACK = 20;

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

// Calcula niveis relevantes para a UI.
export function computeLevels(history) {
  const points = toOhlcvPoints(history);
  if (points.length < LEVEL_LOOKBACK + 1) {
    return { ok: false, reason: 'Sem dados' };
  }

  const closes = points.map((p) => p.close);
  const breakoutHigh = findSwingHigh(closes, LEVEL_LOOKBACK);
  const breakoutLow = findSwingLow(closes, LEVEL_LOOKBACK);
  const lows = points.slice(points.length - LEVEL_LOOKBACK).map((p) => p.low);
  const stop = Math.min(...lows);
  const invalidation = stop;

  if (!Number.isFinite(breakoutHigh) || !Number.isFinite(breakoutLow) || !Number.isFinite(stop)) {
    return { ok: false, reason: 'Invalido' };
  }

  return {
    ok: true,
    breakoutHigh,
    breakoutLow,
    stop,
    invalidation
  };
}
