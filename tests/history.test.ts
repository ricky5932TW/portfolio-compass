import { describe, expect, it } from 'vitest';
import { buildDailySnapshot, isDailySnapshot, parseDailyHistory, upsertDailySnapshot } from '../src/lib/history';
import { evaluatePortfolio, type PortfolioDocument } from '../src/lib/portfolio';

const document: PortfolioDocument = {
  holdings: [{ market: 'TW', symbol: '2330', name: 'TSMC', averageCost: 500, quantity: 2, targetWeightPct: 50 }],
  cash: { TWD: 1000, USD: 0, JPY: 0 },
};
const market = { quotes: [{ market: 'TW' as const, symbol: '2330', currency: 'TWD' as const, price: 500, asOf: '2026-10-17', source: 'test' }], fx: null, errors: [] };

describe('daily history', () => {
  it('records TWD total and per-instrument and cash weights only with a complete valuation', () => {
    const snapshot = buildDailySnapshot(evaluatePortfolio(document, market), '2026-10-17', document.cash);
    expect(snapshot).toMatchObject({ date: '2026-10-17', totalAssetsTwd: 2000 });
    expect(snapshot?.allocations).toEqual([
      { key: 'holding:TW:2330', label: 'TSMC', kind: 'holding', valueTwd: 1000, weightPct: 50 },
      { key: 'cash:TWD', label: 'TWD 現金', kind: 'cash', valueTwd: 1000, weightPct: 50 },
    ]);
    expect(buildDailySnapshot(evaluatePortfolio({ ...document, holdings: [{ ...document.holdings[0], quantity: 0 }] }, { ...market, quotes: [] }), '2026-10-17')).not.toBeNull();
    expect(buildDailySnapshot(evaluatePortfolio(document, { ...market, quotes: [] }), '2026-10-17')).toBeNull();
  });

  it('replaces the same date and keeps a sorted unique daily series', () => {
    const first = { date: '2026-10-16', totalAssetsTwd: 100, allocations: [] };
    const updated = { ...first, totalAssetsTwd: 120 };
    const next = { date: '2026-10-17', totalAssetsTwd: 130, allocations: [] };
    expect(upsertDailySnapshot([first, next], updated)).toEqual([updated, next]);
    expect(parseDailyHistory([first, updated, { ...next, totalAssetsTwd: -1 }])).toEqual([updated]);
  });

  it('keeps each cash currency separate and converts it with the snapshot FX rates', () => {
    const mixed = { ...document, cash: { TWD: 10, USD: 2, JPY: 100 } };
    const fx = { ...market, fx: { base: 'TWD' as const, rates: { TWD: 1, USD: 30, JPY: 0.2 }, asOf: '2026-10-17', source: 'test' } };
    const totalValuation = evaluatePortfolio(mixed, fx);
    const result = buildDailySnapshot(totalValuation, '2026-10-17', mixed.cash, fx.fx.rates);
    expect(result?.allocations.filter((item) => item.kind === 'cash').map((item) => [item.key, item.valueTwd])).toEqual([
      ['cash:TWD', 10], ['cash:USD', 60], ['cash:JPY', 20],
    ]);
  });

  it('rejects malformed or non-finite snapshot fields', () => {
    expect(isDailySnapshot({ date: '2026-02-30', totalAssetsTwd: 2, allocations: [] })).toBe(false);
    expect(isDailySnapshot({ date: '2026-10-17', totalAssetsTwd: Infinity, allocations: [] })).toBe(false);
  });
});
