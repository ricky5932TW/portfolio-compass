export type Market = 'TW' | 'TWO' | 'US' | 'JP';
export type Currency = 'TWD' | 'USD' | 'JPY';
export type MarketMinimumShares = Record<Market, number>;
export const MARKET_MINIMUM_SHARES_KEY = 'portfolio-visualizer-v1:market-minimum-shares';
export const DEFAULT_MARKET_MINIMUM_SHARES: MarketMinimumShares = { TW: 1, TWO: 1, US: 1, JP: 100 };

export function loadMarketMinimumShares(): MarketMinimumShares {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(MARKET_MINIMUM_SHARES_KEY) ?? 'null');
    if (typeof saved === 'object' && saved !== null) {
      const value = saved as Partial<MarketMinimumShares>;
      return Object.fromEntries((Object.keys(DEFAULT_MARKET_MINIMUM_SHARES) as Market[]).map((market) => {
        const shares = value[market];
        return [market, Number.isInteger(shares) && (shares ?? 0) > 0 && (shares ?? Infinity) <= 1_000_000 ? shares : DEFAULT_MARKET_MINIMUM_SHARES[market]];
      })) as MarketMinimumShares;
    }
  } catch {
    // Defaults apply when storage is unavailable or malformed.
  }
  return { ...DEFAULT_MARKET_MINIMUM_SHARES };
}

export function scaleAllocationPercent(percent?: number): number {
  const value = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent! : 0));
  return value <= 15 ? value / 15 * 70 : 70 + (value - 15) / 85 * 30;
}

export interface Instrument {
  market: Market;
  symbol: string;
  name: string;
  averageCost: number;
  quantity: number;
  targetWeightPct: number;
  longTermTargetPrice?: number;
  manualPriceOverride?: Quote;
}

export interface PortfolioDocument {
  holdings: Instrument[];
  cash: Record<Currency, number>;
  targetCashWeightPct?: number;
}

export interface Quote {
  market: Market;
  symbol: string;
  currency: Currency;
  price: number;
  asOf: string;
  source: string;
}

export interface FxRates {
  base: 'TWD';
  rates: Record<Currency, number>;
  asOf: string;
  source: string;
}

export interface MarketSnapshot {
  quotes: Quote[];
  fx: FxRates | null;
  errors: Array<{ symbol?: string; message: string }>;
}

export type ManualQuotes = Record<string, Quote>;
export const quoteKey = (market: Market, symbol: string) => `${market}:${symbol.trim().toUpperCase()}`;

export function createManualQuote(market: Market, symbol: string, price: number, asOf: string): Quote | null {
  if (!Number.isFinite(price) || price <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return null;
  const date = new Date(`${asOf}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== asOf) return null;
  return { market, symbol: symbol.trim().toUpperCase(), currency: MARKET_CURRENCY_MAP[market], price, asOf, source: '手動輸入' };
}

export function applyManualQuotes(snapshot: MarketSnapshot, overrides: ManualQuotes): MarketSnapshot {
  const quotes = new Map(snapshot.quotes.map(q => [quoteKey(q.market, q.symbol), q]));
  for (const quote of Object.values(overrides)) quotes.set(quoteKey(quote.market, quote.symbol), quote);
  return { ...snapshot, quotes: Array.from(quotes.values()) };
}

export const MARKET_CURRENCY_MAP: Record<Market, Currency> = {
  TW: 'TWD', TWO: 'TWD', US: 'USD', JP: 'JPY',
};

export interface MissingRequirement {
  type: 'quote' | 'fx';
  key: string;
  message: string;
}

export interface HoldingValuation {
  instrument: Instrument;
  currency: Currency;
  fxRateTwd?: number;
  quote?: Quote;
  currentValueTwd?: number;
  targetAmountTwd?: number;
  differenceTwd?: number;
  differenceNative?: number;
  currentWeightPct?: number;
  unrealizedPlTwd?: number;
  unrealizedPlNative?: number;
  unrealizedPlPct?: number;
}

export interface PortfolioValuation {
  complete: boolean;
  missing: MissingRequirement[];
  holdings: HoldingValuation[];
  cashTargetWeightPct: number;
  totalStockTwd?: number;
  totalCashTwd?: number;
  totalAssetsTwd?: number;
  totalCostBasisTwd?: number;
  totalUnrealizedPlTwd?: number;
  cashTargetAmountTwd?: number;
  cashDifferenceTwd?: number;
}

export type WholeShareAction = { side: 'buy' | 'sell' | 'none'; shares: number };

export function recommendWholeShareTrade(differenceNative?: number, quotePrice?: number, minimumShares = 1): WholeShareAction | null {
  if (differenceNative === undefined || !Number.isFinite(differenceNative) || quotePrice === undefined || !Number.isFinite(quotePrice) || quotePrice <= 0 || !Number.isInteger(minimumShares) || minimumShares < 1) return null;
  if (differenceNative === 0) return { side: 'none', shares: 0 };
  const side = differenceNative > 0 ? 'sell' : 'buy';
  const rawShares = Math.floor(Math.abs(differenceNative) / quotePrice);
  const shares = Math.floor(rawShares / minimumShares) * minimumShares;
  return { side, shares };
}

export function rebalanceAlertLevel(gapPct: number | undefined, thresholdPct: number, shares: number | undefined, minimumShares: number, isCash = false): 'none' | 'caution' | 'actionable' {
  if (gapPct === undefined || !Number.isFinite(gapPct) || Math.abs(gapPct) < thresholdPct) return 'none';
  if (isCash) return 'actionable';
  return shares !== undefined && Number.isInteger(minimumShares) && minimumShares > 0 && shares >= minimumShares ? 'actionable' : 'caution';
}

export function targetPriceGapPct(currentPrice?: number, targetPrice?: number): number | null {
  if (!positive(currentPrice) || !positive(targetPrice)) return null;
  return (targetPrice / currentPrice - 1) * 100;
}

export function targetPriceGapFromCostPct(averageCost?: number, targetPrice?: number): number | null {
  if (!positive(averageCost) || !positive(targetPrice)) return null;
  return (targetPrice / averageCost - 1) * 100;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const validNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const positive = (value: unknown): value is number => validNumber(value) && value > 0;
const currencies: Currency[] = ['TWD', 'USD', 'JPY'];
const markets: Market[] = ['TW', 'TWO', 'US', 'JP'];

export function validatePortfolioDocument(input: unknown): string[] {
  if (!isRecord(input)) return ['投資組合資料格式錯誤'];
  const errors: string[] = [];
  if (!Array.isArray(input.holdings)) errors.push('持股資料必須是清單');
  if (!isRecord(input.cash)) errors.push('現金資料格式錯誤');
  if (isRecord(input.cash)) for (const currency of currencies) {
    const amount = input.cash[currency];
    if (!validNumber(amount) || amount < 0) errors.push(`${currency} 現金必須是大於或等於零的有限數字`);
  }
  if (input.targetCashWeightPct !== undefined &&
      (!validNumber(input.targetCashWeightPct) || input.targetCashWeightPct < 0 || input.targetCashWeightPct > 100)) {
    errors.push('現金目標比例必須介於 0% 到 100%');
  }
  if (!Array.isArray(input.holdings)) return errors;

  let targetTotal = 0;
  const seen = new Set<string>();
  input.holdings.forEach((entry, i) => {
    if (!isRecord(entry)) { errors.push(`第 ${i + 1} 項持股格式錯誤`); return; }
    const market = entry.market;
    const symbol = entry.symbol;
    if (typeof market !== 'string' || !markets.includes(market as Market)) errors.push(`第 ${i + 1} 項市場代碼無效`);
    if (typeof symbol !== 'string' || !symbol.trim()) errors.push(`第 ${i + 1} 項股票代碼不可空白`);
    if (typeof entry.name !== 'string') errors.push(`第 ${i + 1} 項名稱格式錯誤`);
    if (entry.manualPriceOverride !== undefined) {
      const q = entry.manualPriceOverride;
      const validDate = isRecord(q) && typeof q.asOf === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.asOf) &&
        !Number.isNaN(new Date(`${q.asOf}T00:00:00Z`).getTime()) && new Date(`${q.asOf}T00:00:00Z`).toISOString().slice(0, 10) === q.asOf;
      if (!isRecord(q) || q.market !== market || typeof symbol !== 'string' || q.symbol !== symbol.trim().toUpperCase() ||
        !positive(q.price) || !validDate ||
        q.currency !== MARKET_CURRENCY_MAP[market as Market] || q.source !== '手動輸入') errors.push(`第 ${i + 1} 項手動市價資料無效`);
    }
    for (const field of ['averageCost', 'quantity', 'targetWeightPct'] as const) {
      if (!validNumber(entry[field])) errors.push(`第 ${i + 1} 項${field}必須是有限數字`);
    }
    if (entry.longTermTargetPrice !== undefined && !positive(entry.longTermTargetPrice)) errors.push(`第 ${i + 1} 項長期目標價必須大於零`);
    if (validNumber(entry.averageCost) && entry.averageCost < 0) errors.push(`第 ${i + 1} 項平均成本不可為負數`);
    if (validNumber(entry.quantity) && entry.quantity < 0) errors.push(`第 ${i + 1} 項股數不可為負數`);
    if (validNumber(entry.targetWeightPct)) {
      if (entry.targetWeightPct < 0 || entry.targetWeightPct > 100) errors.push(`第 ${i + 1} 項目標比例必須介於 0% 到 100%`);
      else targetTotal += entry.targetWeightPct;
    }
    if (typeof market === 'string' && typeof symbol === 'string' && symbol.trim()) {
      const key = `${market}:${symbol.trim().toUpperCase()}`;
      if (seen.has(key)) errors.push(`標的重複：${key}`);
      seen.add(key);
    }
  });
  targetTotal += validNumber(input.targetCashWeightPct) ? input.targetCashWeightPct : 0;
  if (targetTotal > 100 + 1e-9) errors.push('股票與現金目標比例合計不可超過 100%');
  return errors;
}

export function evaluatePortfolio(doc: PortfolioDocument, snapshot: MarketSnapshot): PortfolioValuation {
  const missing: MissingRequirement[] = [];
  const requiredFx = new Set<Currency>();
  if (doc.cash.USD > 0) requiredFx.add('USD');
  if (doc.cash.JPY > 0) requiredFx.add('JPY');
  for (const holding of doc.holdings) if (holding.quantity > 0) {
    const currency = MARKET_CURRENCY_MAP[holding.market];
    if (currency !== 'TWD') requiredFx.add(currency);
  }

  const fx: Record<Currency, number | undefined> = { TWD: 1, USD: undefined, JPY: undefined };
  for (const currency of ['USD', 'JPY'] as const) {
    const rate = snapshot.fx?.rates?.[currency];
    if (positive(rate)) fx[currency] = rate;
  }
  for (const currency of requiredFx) if (!fx[currency]) {
    missing.push({ type: 'fx', key: currency, message: `缺少 ${currency} 兌新台幣匯率` });
  }

  const rows = doc.holdings.map((instrument): HoldingValuation => {
    const currency = MARKET_CURRENCY_MAP[instrument.market];
    const quote = instrument.manualPriceOverride ?? snapshot.quotes.find(q => q.market === instrument.market && q.symbol.toUpperCase() === instrument.symbol.toUpperCase());
    const hasQuote = positive(quote?.price);
    const rate = fx[currency];
    if (instrument.quantity > 0 && !hasQuote) missing.push({
      type: 'quote', key: `${instrument.market}:${instrument.symbol}`, message: `缺少 ${instrument.symbol} 行情`,
    });
    const currentValueTwd = instrument.quantity === 0 ? 0 : hasQuote && rate
      ? instrument.quantity * quote!.price * rate : undefined;
    const unrealizedPlTwd = instrument.quantity === 0 ? 0 : hasQuote && rate
      ? (quote!.price - instrument.averageCost) * instrument.quantity * rate : undefined;
    const cost = instrument.quantity * instrument.averageCost;
    return {
      instrument, currency, fxRateTwd: rate, quote: hasQuote ? quote : undefined, currentValueTwd,
      unrealizedPlTwd,
      unrealizedPlNative: instrument.quantity === 0 ? 0 : hasQuote && rate
        ? (quote!.price - instrument.averageCost) * instrument.quantity : undefined,
      unrealizedPlPct: instrument.quantity === 0 ? 0 : hasQuote && cost > 0
        ? ((quote!.price - instrument.averageCost) * instrument.quantity / cost) * 100 : undefined,
    };
  });

  let cashTwd: number | undefined = doc.cash.TWD;
  for (const currency of ['USD', 'JPY'] as const) {
    if (doc.cash[currency] > 0) {
      cashTwd = cashTwd !== undefined && fx[currency] ? cashTwd + doc.cash[currency] * fx[currency]! : undefined;
    } else if (cashTwd !== undefined) {
      cashTwd += 0;
    }
  }
  const complete = missing.length === 0;
  const cashTargetWeightPct = doc.targetCashWeightPct ?? 0;
  const totalStockTwd = complete ? rows.reduce((sum, row) => sum + (row.currentValueTwd ?? 0), 0) : undefined;
  const totalCashTwd = complete ? cashTwd : undefined;
  const totalAssetsTwd = complete && totalStockTwd !== undefined && totalCashTwd !== undefined
    ? totalStockTwd + totalCashTwd : undefined;
  const costInputsValid = doc.holdings.every((holding) => {
    const currency = MARKET_CURRENCY_MAP[holding.market];
    return currency !== undefined && validNumber(holding.averageCost) && holding.averageCost >= 0 &&
      validNumber(holding.quantity) && holding.quantity >= 0 &&
      (holding.quantity === 0 || (fx[currency] !== undefined && Number.isFinite(fx[currency])));
  });
  const costBasisValue = costInputsValid ? doc.holdings.reduce((sum, holding) => {
    const currency = MARKET_CURRENCY_MAP[holding.market];
    const rate = fx[currency] ?? 1;
    return sum + holding.averageCost * holding.quantity * rate;
  }, 0) : undefined;
  const totalCostBasisTwd = costBasisValue !== undefined && Number.isFinite(costBasisValue) ? costBasisValue : undefined;
  const totalUnrealizedPlTwd = complete && totalStockTwd !== undefined && totalCostBasisTwd !== undefined
    ? totalStockTwd - totalCostBasisTwd : undefined;

  if (complete && totalAssetsTwd !== undefined) for (const row of rows) {
    const value = row.currentValueTwd ?? 0;
    row.currentWeightPct = totalAssetsTwd > 0 ? value / totalAssetsTwd * 100 : undefined;
    row.targetAmountTwd = totalAssetsTwd * row.instrument.targetWeightPct / 100;
    row.differenceTwd = value - row.targetAmountTwd;
    row.differenceNative = row.fxRateTwd !== undefined && row.fxRateTwd > 0
      ? row.differenceTwd / row.fxRateTwd : undefined;
  }
  return {
    complete, missing, holdings: rows, cashTargetWeightPct, totalStockTwd, totalCashTwd,
    totalAssetsTwd, totalCostBasisTwd, totalUnrealizedPlTwd,
    cashTargetAmountTwd: complete && totalAssetsTwd !== undefined ? totalAssetsTwd * cashTargetWeightPct / 100 : undefined,
    cashDifferenceTwd: complete && totalAssetsTwd !== undefined && totalCashTwd !== undefined
      ? totalCashTwd - totalAssetsTwd * cashTargetWeightPct / 100 : undefined,
  };
}
