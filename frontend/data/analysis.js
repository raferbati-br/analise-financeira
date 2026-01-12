import { computeTrend } from '../analysis/trend.js';
import { detectSetups } from '../analysis/patterns.js';
import { detectConfirmations } from '../analysis/volume.js';
import { computeLevels, computeRiskReward } from '../analysis/risk.js';
import { computeScore } from '../analysis/score.js';
import { state } from '../state.js';
import { fetchHistoryCached } from './history.js';

export async function buildAnalysisForTickers(tickers, range, interval) {
  await Promise.all(
    tickers.map(async (symbol) => {
      const data = await fetchHistoryCached(symbol, range, interval);
      if (!data.ok) {
        state.analysisCache.set(symbol, { ok: false });
        return;
      }
      const history = data.history || [];
      const logo = data.logo || null;
      const last = history[history.length - 1] || {};
      const quote = {
        open: last.open,
        high: last.high,
        low: last.low,
        close: last.close ?? last.adjustedClose,
        volume: last.volume,
        timestamp: last.date ? last.date * 1000 : null
      };
      const score = computeScore(history);
      const trend = computeTrend(history);
      const setups = detectSetups(history);
      const confirmations = detectConfirmations(history);
      const risk = computeRiskReward(history);
      const levels = computeLevels(history);
      const rr = risk.ok ? risk.rr : 0;
      state.analysisCache.set(symbol, {
        ok: true,
        score,
        trend,
        setups,
        confirmations,
        risk,
        levels,
        rr,
        quote,
        logo
      });
    })
  );
}
