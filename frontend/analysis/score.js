import { computeTrend } from './trend.js';
import { detectSetups } from './patterns.js';
import { detectConfirmations } from './volume.js';
import { computeMomentum } from './momentum.js';
import { computeRiskReward } from './risk.js';

// Converte tendencia em pontos.
export function scoreTrend(history) {
  const trend = computeTrend(history);
  if (trend.label === 'Alta') return 20;
  if (trend.label === 'Baixa') return 0;
  if (trend.label === 'Lateral') return 10;
  return 5;
}

// Converte setups em pontos.
export function scorePattern(history) {
  const setups = detectSetups(history);
  if (setups.length === 0) return 0;
  return Math.min(20, setups.length * 7);
}

// Converte confirmacoes em pontos.
export function scoreVolume(history) {
  const confirmations = detectConfirmations(history);
  if (confirmations.includes('Volume acima da media')) return 20;
  return 0;
}

// Converte momento em pontos.
export function scoreMomentum(history) {
  const momentum = computeMomentum(history);
  if (momentum === null) return 0;
  if (momentum > 0.05) return 20;
  if (momentum > 0.02) return 15;
  if (momentum > 0) return 10;
  if (momentum > -0.02) return 5;
  return 0;
}

// Converte risco/retorno em pontos.
export function scoreRiskReward(history) {
  const risk = computeRiskReward(history);
  if (!risk.ok) return 0;
  if (risk.rr >= 3) return 20;
  if (risk.rr >= 2) return 15;
  if (risk.rr >= 1.5) return 8;
  return 0;
}

// Calcula score total (0-100) por confluencia de fatores.
export function computeScore(history) {
  const trendScore = scoreTrend(history);
  const patternScore = scorePattern(history);
  const volumeScore = scoreVolume(history);
  const momentumScore = scoreMomentum(history);
  const rrScore = scoreRiskReward(history);
  const total = trendScore + patternScore + volumeScore + momentumScore + rrScore;

  return {
    total,
    breakdown: {
      trendScore,
      patternScore,
      volumeScore,
      momentumScore,
      rrScore
    }
  };
}
