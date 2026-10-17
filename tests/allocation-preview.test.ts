import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import AllocationPreview from '../src/components/AllocationPreview';
import type { PortfolioValuation } from '../src/lib/portfolio';

const holding = {
  instrument: {
    market: 'TW' as const,
    symbol: '2330',
    name: '台積電',
    averageCost: 100,
    quantity: 1,
    targetWeightPct: 0,
  },
  currency: 'TWD' as const,
};

it('shows a held stock with a zero target and flags its allocation gap', () => {
  const evaluation: PortfolioValuation = {
    complete: true,
    missing: [],
    holdings: [{ ...holding, quote: { market: 'TW', symbol: '2330', currency: 'TWD', price: 10, asOf: '2026-10-17', source: 'test' }, differenceNative: 1000, currentValueTwd: 100, currentWeightPct: 100 }],
    cashTargetWeightPct: 0,
    totalAssetsTwd: 100,
    totalCashTwd: 0,
  };
  const html = renderToStaticMarkup(createElement(AllocationPreview, { evaluation }));
  expect(html).toContain('未配置 100.0%');
  expect(html).toContain('目標 0.0% · 目前 100.0%');
  expect(html).toContain('超出 100.0 個百分點');
  expect(html).toContain('優先處理');
});

it('keeps an over-threshold Japanese share gap yellow below one lot and red once it reaches a lot', () => {
  const jpHolding = { ...holding, instrument: { ...holding.instrument, market: 'JP' as const, symbol: '7203', targetWeightPct: 0 }, quote: { market: 'JP' as const, symbol: '7203', currency: 'JPY' as const, price: 100, asOf: '2026-10-17', source: 'test' } };
  const renderGap = (differenceNative: number) => renderToStaticMarkup(createElement(AllocationPreview, { evaluation: {
    complete: true, missing: [], holdings: [{ ...jpHolding, differenceNative, currentValueTwd: 100, currentWeightPct: 10 }],
    cashTargetWeightPct: 0, totalAssetsTwd: 1000, totalCashTwd: 0,
  } }));
  const belowLot = renderGap(9900);
  expect(belowLot).toContain('比例已超過警示值，但估算差距不足最低操作量（100 股）');
  expect(belowLot).toContain('差距未達 100 股');
  expect(belowLot).not.toContain('優先處理');
  const reachesLot = renderGap(10000);
  expect(reachesLot).toContain('優先處理');
  expect(reachesLot).not.toContain('差距未達 100 股');
});

it('separates over and under allocations and sorts each by the largest percentage gap', () => {
  const evaluation: PortfolioValuation = {
    complete: true,
    missing: [],
    holdings: [
      { ...holding, instrument: { ...holding.instrument, symbol: 'OVR1', name: 'Over 1', targetWeightPct: 10 }, currentValueTwd: 30, currentWeightPct: 30, unrealizedPlPct: 14.2 },
      { ...holding, instrument: { ...holding.instrument, symbol: 'OVR2', name: 'Over 2', targetWeightPct: 20 }, currentValueTwd: 25, currentWeightPct: 25 },
      { ...holding, instrument: { ...holding.instrument, symbol: 'UND1', name: 'Under 1', targetWeightPct: 20 }, currentValueTwd: 5, currentWeightPct: 5, unrealizedPlPct: -3.7 },
      { ...holding, instrument: { ...holding.instrument, symbol: 'UND2', name: 'Under 2', targetWeightPct: 10 }, currentValueTwd: 0, currentWeightPct: 0 },
    ],
    cashTargetWeightPct: 40,
    totalAssetsTwd: 100,
    totalCashTwd: 40,
  };
  const html = renderToStaticMarkup(createElement(AllocationPreview, { evaluation }));
  const over = html.split('>投入過多</div>')[1].split('>投入過少</div>')[0];
  const under = html.split('>投入過少</div>')[1].split('aria-label="已達目標"')[0];
  expect(over.indexOf('Over 1')).toBeLessThan(over.indexOf('Over 2'));
  expect(under.indexOf('Under 1')).toBeLessThan(under.indexOf('Under 2'));
  expect(html).toContain('aria-label="未實現報酬率 +14.2%"');
  expect(html).toContain('aria-label="未實現報酬率 -3.7%"');
});

it('does not raise a gap alert when a held stock lacks a quote', () => {
  const evaluation: PortfolioValuation = {
    complete: false,
    missing: [{ type: 'quote', key: 'TW:2330', message: '缺少 2330 行情' }],
    holdings: [holding],
    cashTargetWeightPct: 0,
  };
  const html = renderToStaticMarkup(createElement(AllocationPreview, { evaluation }));
  expect(html).toContain('目標 0.0% · 目前 —');
  expect(html).toContain('差距：估值不完整');
  expect(html).not.toMatch(/<strong[^>]*>優先處理<\/strong>/);
});

it('renders the remaining target allocation as 未配置 rather than cash', () => {
  const evaluation: PortfolioValuation = {
    complete: false,
    missing: [],
    holdings: [
      { ...holding, instrument: { ...holding.instrument, symbol: 'AAA', name: 'AAA', targetWeightPct: 10 } },
      { ...holding, instrument: { ...holding.instrument, symbol: 'BBB', name: 'BBB', targetWeightPct: 10 } },
    ],
    cashTargetWeightPct: 0,
  };
  const html = renderToStaticMarkup(createElement(AllocationPreview, { evaluation }));
  expect(html).toContain('目標配置：AAA 10.0%、BBB 10.0%、未配置 80.0%');
  expect(html).toContain('aria-label="尚未配置 80.0%"');
  expect(html).toContain('<title>未配置 80.0%</title>');
  expect(html).toContain('<text x=');
  expect(html).toContain('title="AAA"');
  expect(html).toContain('title="BBB"');
  expect(html).not.toContain('目標配置：AAA 10.0%、BBB 10.0%、現金 80.0%');
});

it('shows cash as a separate target position alongside unallocated weight', () => {
  const evaluation: PortfolioValuation = {
    complete: true,
    missing: [],
    holdings: [{ ...holding, instrument: { ...holding.instrument, targetWeightPct: 10 }, currentValueTwd: 10, currentWeightPct: 10 }],
    cashTargetWeightPct: 10,
    totalAssetsTwd: 100,
    totalCashTwd: 20,
    cashTargetAmountTwd: 10,
    cashDifferenceTwd: 10,
  };
  const html = renderToStaticMarkup(createElement(AllocationPreview, { evaluation }));
  expect(html).toContain('目標配置：台積電 10.0%、現金 10.0%、未配置 80.0%');
  expect(html).toContain('現金');
  expect(html).toContain('aria-label="尚未配置 80.0%"');
  expect(html).toContain('實際現金 20.0%');
});

it('shows a zero unallocated target when stock targets use the full 100%', () => {
  const evaluation: PortfolioValuation = {
    complete: false,
    missing: [],
    holdings: [{ ...holding, instrument: { ...holding.instrument, targetWeightPct: 100 } }],
    cashTargetWeightPct: 0,
  };
  const html = renderToStaticMarkup(createElement(AllocationPreview, { evaluation }));
  expect(html).toContain('aria-label="尚未配置 0.0%"');
  expect(html).toContain('目標配置：台積電 100.0%');
  expect(html).toContain('<title>台積電 100.0%</title>');
  expect(html).toContain('>2330</text>');
  expect(html).not.toContain('<title>未配置 0.0%</title>');
});

it('shows current pie labels and keeps each asset color consistent with its target pie', () => {
  const evaluation: PortfolioValuation = {
    complete: true,
    missing: [],
    holdings: [{ ...holding, instrument: { ...holding.instrument, targetWeightPct: 10 }, currentValueTwd: 15, currentWeightPct: 15 }],
    cashTargetWeightPct: 10,
    totalAssetsTwd: 100,
    totalCashTwd: 85,
  };
  const html = renderToStaticMarkup(createElement(AllocationPreview, { evaluation }));
  expect(html).toContain('aria-label="目前配置：台積電 15.0%、現金 85.0%"');
  expect(html).toContain('aria-label="目標配置：台積電 10.0%、現金 10.0%、未配置 80.0%"');
  expect(html).toContain('>2330</text>');
  expect(html).toContain('>15.0%</text>');
  expect(html).toContain('>目前</li>');
  expect(html).toContain('>目標</li>');
  expect((html.match(/#2563eb/g) ?? []).length).toBeGreaterThanOrEqual(3);
  expect(html).toContain('class="allocation-pie-pair"');
});

it('labels 10% and 9% holdings by ticker without making the narrow slices overlap', () => {
  const evaluation: PortfolioValuation = {
    complete: true,
    missing: [],
    holdings: [
      { ...holding, instrument: { ...holding.instrument, symbol: 'KWHV', name: 'KWHV', targetWeightPct: 10 }, currentValueTwd: 10, currentWeightPct: 10 },
      { ...holding, instrument: { ...holding.instrument, symbol: 'RST', name: 'RST', targetWeightPct: 9 }, currentValueTwd: 9, currentWeightPct: 9 },
    ],
    cashTargetWeightPct: 0,
    totalAssetsTwd: 100,
    totalCashTwd: 81,
  };
  const html = renderToStaticMarkup(createElement(AllocationPreview, { evaluation }));
  expect(html).toContain('<title>KWHV 10.0%</title>');
  expect(html).toContain('<title>RST 9.0%</title>');
  expect(html).toContain('>KWHV</text>');
  expect(html).toContain('>RST</text>');
});

it('shows the unallocated target percentage as a prominent live KPI', () => {
  const evaluation: PortfolioValuation = {
    complete: false,
    missing: [],
    holdings: [{ ...holding, instrument: { ...holding.instrument, targetWeightPct: 25 } }],
    cashTargetWeightPct: 70,
  };
  const html = renderToStaticMarkup(createElement(AllocationPreview, { evaluation }));
  expect(html).toContain('aria-label="尚未配置 5.0%"');
  expect(html).toContain('>尚未配置</div>');
  expect(html).toContain('>5.0%</strong>');
});
