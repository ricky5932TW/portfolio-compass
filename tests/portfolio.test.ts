import { describe, it, expect } from 'vitest';
import { evaluatePortfolio, validatePortfolioDocument, PortfolioDocument, MarketSnapshot, createManualQuote, recommendWholeShareTrade, targetPriceGapPct, targetPriceGapFromCostPct } from '../src/lib/portfolio';

describe('Portfolio Evaluation & Validation', () => {
  it('validates explicit cash targets together with stock targets and permits unallocated remainder', () => {
    const document: PortfolioDocument = {
      holdings: [{ market: 'TW', symbol: '2330', name: 'TSMC', averageCost: 80, quantity: 10, targetWeightPct: 10 }],
      cash: { TWD: 0, USD: 0, JPY: 0 }, targetCashWeightPct: 10,
    };
    expect(validatePortfolioDocument(document)).toEqual([]); // 80% remains unallocated.
    expect(validatePortfolioDocument({ ...document, targetCashWeightPct: 91 })).toContain('股票與現金目標比例合計不可超過 100%');
    expect(validatePortfolioDocument({ ...document, targetCashWeightPct: -1 })).toContain('現金目標比例必須介於 0% 到 100%');
  });

  it('compares actual cash with its target independently of stock holdings', () => {
    const holdings: PortfolioDocument = {
      holdings: [{ market: 'TW', symbol: '2330', name: 'TSMC', averageCost: 80, quantity: 10, targetWeightPct: 70 }],
      cash: { TWD: 100, USD: 0, JPY: 0 }, targetCashWeightPct: 20,
    };
    const snapshot: MarketSnapshot = { quotes: [{ market: 'TW', symbol: '2330', currency: 'TWD', price: 100, asOf: '2026-10-17', source: 'test' }], fx: null, errors: [] };
    const valuation = evaluatePortfolio(holdings, snapshot);
    expect(valuation.totalCashTwd).toBe(100);
    expect(valuation.totalAssetsTwd).toBe(1100);
    expect(valuation.cashTargetWeightPct).toBe(20);
    expect(valuation.cashTargetAmountTwd).toBe(220);
    expect(valuation.cashDifferenceTwd).toBe(-120);
    expect(valuation.holdings[0].currentWeightPct).toBeCloseTo(90.91, 2);
  });

  it('keeps the explicit cash target separate from unallocated target weight', () => {
    const quote: MarketSnapshot = {
      quotes: [{ market: 'TW', symbol: '2330', currency: 'TWD', price: 100, asOf: '2026-10-17', source: 'test' }],
      fx: null,
      errors: [],
    };
    const evaluateTarget = (targetWeightPct: number, marketSnapshot: MarketSnapshot, targetCashWeightPct: number) => evaluatePortfolio({
      holdings: [{ market: 'TW', symbol: '2330', name: 'TSMC', averageCost: 80, quantity: 1, targetWeightPct }],
      cash: { TWD: 0, USD: 0, JPY: 0 }, targetCashWeightPct,
    }, marketSnapshot);

    const noCashTarget = evaluateTarget(100, quote, 0);
    expect(noCashTarget.cashTargetWeightPct).toBe(0);
    expect(noCashTarget.cashTargetAmountTwd).toBe(0);

    const allCashTarget = evaluateTarget(0, quote, 100);
    expect(allCashTarget.cashTargetWeightPct).toBe(100);
    expect(allCashTarget.cashTargetAmountTwd).toBe(100);

    const incomplete = evaluateTarget(25, { ...quote, quotes: [] }, 30);
    expect(incomplete.complete).toBe(false);
    expect(incomplete.cashTargetWeightPct).toBe(30);
    expect(incomplete.cashTargetAmountTwd).toBeUndefined();
  });

  it('uses a valid manual native-currency quote for valuation until cleared', () => {
    const instrument = { market: 'US' as const, symbol: 'AAPL', name: 'Apple', averageCost: 80, quantity: 2, targetWeightPct: 25,
      manualPriceOverride: createManualQuote('US', 'AAPL', 120, '2026-10-16')! };
    const doc: PortfolioDocument = { holdings: [instrument], cash: { TWD: 100, USD: 0, JPY: 0 } };
    const snapshot: MarketSnapshot = { quotes: [], fx: { base: 'TWD', rates: { TWD: 1, USD: 32, JPY: 0.2 }, asOf: '2026-10-17', source: 'test' }, errors: [] };
    const result = evaluatePortfolio(doc, snapshot);
    expect(result.complete).toBe(true);
    expect(result.holdings[0].quote?.source).toBe('手動輸入');
    expect(result.holdings[0].currentValueTwd).toBe(7680);
    expect(result.holdings[0].unrealizedPlTwd).toBe(2560);
    expect(evaluatePortfolio({ ...doc, holdings: [{ ...instrument, manualPriceOverride: undefined }] }, snapshot).complete).toBe(false);
  });

  it('rejects zero prices and malformed or impossible manual quote dates', () => {
    expect(createManualQuote('TW', '2330', 0, '2026-10-17')).toBeNull();
    expect(createManualQuote('TW', '2330', 1, '2026-02-30')).toBeNull();
    expect(createManualQuote('TW', '2330', 1, 'yesterday')).toBeNull();
  });
  it('evaluates multi-currency portfolio correctly', () => {
    const doc: PortfolioDocument = {
      holdings: [
        { market: 'US', symbol: 'AAPL', name: 'Apple', averageCost: 80, quantity: 2, targetWeightPct: 25 },
        { market: 'JP', symbol: '7203', name: 'Toyota', averageCost: 900, quantity: 100, targetWeightPct: 50 }
      ],
      cash: { TWD: 10000, USD: 100, JPY: 0 }, targetCashWeightPct: 25,
    };
    const snapshot: MarketSnapshot = {
      quotes: [
        { market: 'US', symbol: 'AAPL', currency: 'USD', price: 100, asOf: '2026-10-17', source: 'test' },
        { market: 'JP', symbol: '7203', currency: 'JPY', price: 1000, asOf: '2026-10-17', source: 'test' }
      ],
      fx: { base: 'TWD', rates: { TWD: 1, USD: 32, JPY: 0.2 }, asOf: '2026-10-17', source: 'test' },
      errors: []
    };

    const res = evaluatePortfolio(doc, snapshot);
    expect(res.complete).toBe(true);
    expect(res.totalAssetsTwd).toBe(39600);
    expect(res.totalStockTwd).toBe(26400);
    expect(res.totalCashTwd).toBe(13200);
    expect(res.totalCostBasisTwd).toBe(23120);
    expect(res.totalUnrealizedPlTwd).toBe(3280);
    expect(res.totalStockTwd! - res.totalCostBasisTwd!).toBe(res.totalUnrealizedPlTwd);
    expect(res.cashTargetWeightPct).toBe(25);
    expect(res.cashTargetAmountTwd).toBe(9900);
    expect(res.cashDifferenceTwd).toBe(3300);

    const us = res.holdings.find(h => h.instrument.market === 'US' && h.instrument.symbol === 'AAPL')!;
    expect(us.currentValueTwd).toBe(6400);
    expect(us.targetAmountTwd).toBe(9900);
    expect(us.differenceTwd).toBe(-3500);
    expect(us.unrealizedPlTwd).toBe(1280);

    const jp = res.holdings.find(h => h.instrument.market === 'JP' && h.instrument.symbol === '7203')!;
    expect(jp.currentValueTwd).toBe(20000);
    expect(jp.targetAmountTwd).toBe(19800);
    expect(jp.differenceTwd).toBe(200);
    expect(jp.unrealizedPlTwd).toBe(2000);
  });

  it('exposes signed suggested difference and unrealized P/L in TWD and each holding currency', () => {
    const fx: MarketSnapshot['fx'] = { base: 'TWD', rates: { TWD: 1, USD: 32, JPY: 0.2 }, asOf: '2026-10-17', source: 'test' };
    const us = evaluatePortfolio({
      holdings: [{ market: 'US', symbol: 'AAPL', name: 'Apple', averageCost: 100, quantity: 2, targetWeightPct: 50 }],
      cash: { TWD: 0, USD: 0, JPY: 0 },
    }, {
      quotes: [{ market: 'US', symbol: 'AAPL', currency: 'USD', price: 120, asOf: '2026-10-17', source: 'test' }], fx, errors: [],
    }).holdings[0];
    expect(us.differenceTwd).toBe(3840);
    expect(us.differenceNative).toBe(120); // TWD over-allocation converted to USD at 32 TWD/USD.
    expect(us.unrealizedPlTwd).toBe(1280);
    expect(us.unrealizedPlNative).toBe(40); // (USD 120 - USD 100) x 2.

    const jp = evaluatePortfolio({
      holdings: [{ market: 'JP', symbol: '7203', name: 'Toyota', averageCost: 900, quantity: 10, targetWeightPct: 50 }],
      cash: { TWD: 0, USD: 0, JPY: 0 },
    }, {
      quotes: [{ market: 'JP', symbol: '7203', currency: 'JPY', price: 1000, asOf: '2026-10-17', source: 'test' }], fx, errors: [],
    }).holdings[0];
    expect(jp.differenceTwd).toBe(1000);
    expect(jp.differenceNative).toBe(5000); // TWD 1,000 over-allocation converted at 0.2 TWD/JPY.
    expect(jp.unrealizedPlTwd).toBe(200);
    expect(jp.unrealizedPlNative).toBe(1000); // (JPY 1,000 - JPY 900) x 10.
  });

  it('recommends whole-share trades from signed native-currency allocation difference without overshooting', () => {
    expect(recommendWholeShareTrade(275, 100)).toEqual({ side: 'sell', shares: 2 });
    expect(recommendWholeShareTrade(-275, 100)).toEqual({ side: 'buy', shares: 2 });
    expect(recommendWholeShareTrade(99.99, 100)).toEqual({ side: 'sell', shares: 0 });
    expect(recommendWholeShareTrade(-0.5, 100)).toEqual({ side: 'buy', shares: 0 });
    expect(recommendWholeShareTrade(0, 100)).toEqual({ side: 'none', shares: 0 });
    expect(recommendWholeShareTrade(275, undefined)).toBeNull();
    expect(recommendWholeShareTrade(undefined, 100)).toBeNull();
    expect(recommendWholeShareTrade(275, 0)).toBeNull();
  });

  it('calculates price distance to a long-term target and accepts only positive optional targets', () => {
    expect(targetPriceGapPct(100, 125)).toBeCloseTo(25);
    expect(targetPriceGapPct(125, 100)).toBeCloseTo(-20);
    expect(targetPriceGapPct(100, 100)).toBe(0);
    expect(targetPriceGapPct(undefined, 100)).toBeNull();
    expect(targetPriceGapPct(100, 0)).toBeNull();

    const document: PortfolioDocument = {
      holdings: [{ market: 'TW', symbol: '2330', name: 'TSMC', averageCost: 100, quantity: 1, targetWeightPct: 100, longTermTargetPrice: 150 }],
      cash: { TWD: 0, USD: 0, JPY: 0 },
    };
    expect(validatePortfolioDocument(document)).toEqual([]);
    expect(validatePortfolioDocument({ ...document, holdings: [{ ...document.holdings[0], longTermTargetPrice: 0 }] })).not.toHaveLength(0);
  });

  it('calculates long-term target price distance from average cost and masks invalid inputs', () => {
    expect(targetPriceGapFromCostPct(100, 125)).toBeCloseTo(25);
    expect(targetPriceGapFromCostPct(100, 80)).toBeCloseTo(-20);
    expect(targetPriceGapFromCostPct(100, 100)).toBe(0);
    expect(targetPriceGapFromCostPct(0, 125)).toBeNull();
    expect(targetPriceGapFromCostPct(Number.NaN, 125)).toBeNull();
    expect(targetPriceGapFromCostPct(100, undefined)).toBeNull();
  });

  it('handles missing quotes and fx gracefully based on quantity', () => {
    const zeroShareDoc: PortfolioDocument = {
      holdings: [{ market: 'US', symbol: 'NVDA', name: 'Nvidia', averageCost: 0, quantity: 0, targetWeightPct: 20 }],
      cash: { TWD: 10000, USD: 0, JPY: 0 }
    };
    const emptySnapshot: MarketSnapshot = { quotes: [], fx: null, errors: [] };
    const zeroRes = evaluatePortfolio(zeroShareDoc, emptySnapshot);
    expect(zeroRes.complete).toBe(true);
    expect(zeroRes.totalAssetsTwd).toBe(10000);

    const nonZeroDoc: PortfolioDocument = {
      holdings: [{ market: 'US', symbol: 'NVDA', name: 'Nvidia', averageCost: 100, quantity: 5, targetWeightPct: 20 }],
      cash: { TWD: 10000, USD: 0, JPY: 0 }
    };
    const nonZeroRes = evaluatePortfolio(nonZeroDoc, emptySnapshot);
    expect(nonZeroRes.complete).toBe(false);
    expect(nonZeroRes.totalAssetsTwd).toBeUndefined();
    expect(nonZeroRes.totalCostBasisTwd).toBeUndefined(); // FX is missing, so the known native cost cannot be converted.

    const stalePriceButKnownFx: MarketSnapshot = {
      quotes: [],
      fx: { base: 'TWD', rates: { TWD: 1, USD: 32, JPY: 0.2 }, asOf: '2026-10-17', source: 'test' },
      errors: [],
    };
    const quoteMissing = evaluatePortfolio(nonZeroDoc, stalePriceButKnownFx);
    expect(quoteMissing.complete).toBe(false);
    expect(quoteMissing.totalCostBasisTwd).toBe(16000);
    expect(quoteMissing.totalUnrealizedPlTwd).toBeUndefined();

    const quoteWithoutFx: MarketSnapshot = {
      quotes: [{ market: 'US', symbol: 'NVDA', currency: 'USD', price: 120, asOf: '2026-10-17', source: 'test' }],
      fx: null,
      errors: [],
    };
    const fxMissing = evaluatePortfolio(nonZeroDoc, quoteWithoutFx);
    expect(fxMissing.missing).toContainEqual({ type: 'fx', key: 'USD', message: '缺少 USD 兌新台幣匯率' });
    expect(fxMissing.totalCostBasisTwd).toBeUndefined();
    expect(fxMissing.holdings[0].unrealizedPlNative).toBeUndefined();
  });

  it('validates weight sums and duplicate symbols case-insensitively', () => {
    const overSumDoc: PortfolioDocument = {
      holdings: [{ market: 'TW', symbol: '2330', name: 'TSMC', averageCost: 500, quantity: 1, targetWeightPct: 101 }],
      cash: { TWD: 0, USD: 0, JPY: 0 }
    };
    expect(validatePortfolioDocument(overSumDoc)).not.toHaveLength(0);

    const duplicateDoc: PortfolioDocument = {
      holdings: [
        { market: 'US', symbol: 'aapl', name: 'Apple 1', averageCost: 100, quantity: 1, targetWeightPct: 20 },
        { market: 'US', symbol: 'AAPL', name: 'Apple 2', averageCost: 100, quantity: 1, targetWeightPct: 20 }
      ],
      cash: { TWD: 0, USD: 0, JPY: 0 }
    };
    expect(validatePortfolioDocument(duplicateDoc)).not.toHaveLength(0);
  });
});
