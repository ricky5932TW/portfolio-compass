import type { Currency, PortfolioDocument, PortfolioValuation } from './portfolio';

export interface AllocationSnapshotItem {
  key: string;
  label: string;
  kind: 'holding' | 'cash';
  valueTwd: number;
  weightPct: number;
}

export interface DailySnapshot {
  date: string;
  totalAssetsTwd: number;
  allocations: AllocationSnapshotItem[];
}

export function taipeiDate(now = new Date()): string {
  return now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
}

export function buildDailySnapshot(
  valuation: PortfolioValuation,
  date: string,
  cash?: PortfolioDocument['cash'],
  fxRates?: Partial<Record<Currency, number>>,
): DailySnapshot | null {
  const total = valuation.totalAssetsTwd;
  if (!valuation.complete || total === undefined || !Number.isFinite(total) || total < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const allocations: AllocationSnapshotItem[] = valuation.holdings.map(({ instrument, currentValueTwd }) => ({
    key: `holding:${instrument.market}:${instrument.symbol.toUpperCase()}`,
    label: instrument.name || instrument.symbol,
    kind: 'holding',
    valueTwd: currentValueTwd ?? 0,
    weightPct: total > 0 ? (currentValueTwd ?? 0) / total * 100 : 0,
  }));
  if (cash && valuation.totalCashTwd !== undefined) {
    for (const currency of ['TWD', 'USD', 'JPY'] as const) {
      const rate = currency === 'TWD' ? 1 : fxRates?.[currency];
      if (cash[currency] > 0 && (!Number.isFinite(rate) || !rate)) return null;
      if (cash[currency] === 0) continue;
      const valueTwd = cash[currency] * (rate ?? 1);
      allocations.push({
        key: `cash:${currency}`, label: `${currency} 現金`, kind: 'cash', valueTwd,
        weightPct: total > 0 ? valueTwd / total * 100 : 0,
      });
    }
  } else if (valuation.totalCashTwd !== undefined) allocations.push({
    key: 'cash:all', label: '現金', kind: 'cash', valueTwd: valuation.totalCashTwd,
    weightPct: total > 0 ? valuation.totalCashTwd / total * 100 : 0,
  });
  if (allocations.some((item) => !Number.isFinite(item.valueTwd) || item.valueTwd < 0 || !Number.isFinite(item.weightPct))) return null;
  return { date, totalAssetsTwd: total, allocations };
}

export function upsertDailySnapshot(history: DailySnapshot[], next: DailySnapshot): DailySnapshot[] {
  const byDate = new Map<string, DailySnapshot>();
  for (const snapshot of history) if (isDailySnapshot(snapshot)) byDate.set(snapshot.date, snapshot);
  byDate.set(next.date, next);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function isDailySnapshot(value: unknown): value is DailySnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Partial<DailySnapshot>;
  if (typeof row.date !== 'string' || !validDate(row.date) ||
      !Number.isFinite(row.totalAssetsTwd) || (row.totalAssetsTwd ?? -1) < 0 || !Array.isArray(row.allocations)) return false;
  return row.allocations.every((item) => item && typeof item.key === 'string' && item.key.length <= 180 &&
    typeof item.label === 'string' && item.label.length <= 120 && (item.kind === 'holding' || item.kind === 'cash') &&
    Number.isFinite(item.valueTwd) && item.valueTwd >= 0 && Number.isFinite(item.weightPct) && item.weightPct >= 0);
}

function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function parseDailyHistory(value: unknown): DailySnapshot[] {
  if (!Array.isArray(value)) return [];
  const rows = value.filter(isDailySnapshot);
  return rows.reduce((result, row) => upsertDailySnapshot(result, row), [] as DailySnapshot[]);
}
