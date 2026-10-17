import React from 'react';
import { DEFAULT_MARKET_MINIMUM_SHARES, recommendWholeShareTrade, rebalanceAlertLevel, type Market, type MarketMinimumShares, type PortfolioValuation } from '../lib/portfolio';

export const ALLOCATION_PALETTE = [
  '#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777',
  '#0891b2', '#4f46e5', '#0d9488', '#ea580c', '#9333ea',
  '#65a30d', '#c026d3', '#0284c7', '#e11d48', '#ca8a04',
];
const CASH_COLOR = '#64748b';
const GAP_STORAGE_KEY = 'portfolio-visualizer-v1:gap-alert-threshold';
const DEFAULT_GAP_THRESHOLD = 5;

function validThreshold(value: number): boolean {
  return Number.isFinite(value) && value >= 0.1 && value <= 100;
}

function savedThreshold(): number {
  try {
    const raw = window.localStorage.getItem(GAP_STORAGE_KEY);
    if (raw !== null) {
      const value = Number(raw);
      if (validThreshold(value)) return value;
    }
  } catch {
    // The setting remains usable when storage is unavailable.
  }
  return DEFAULT_GAP_THRESHOLD;
}

interface Slice {
  id: string;
  name: string;
  pct: number;
  color: string;
  shortLabel?: string;
}

interface TargetLegendRow extends Slice {
  symbol?: string;
  unrealizedPlPct?: number;
  currentPct?: number;
  gapPct?: number;
  currentLabel?: string;
  unallocated?: boolean;
  market?: Market;
  suggestedShares?: number;
  minimumShares?: number;
}

function buildGradient(slices: Slice[], total: number): string {
  if (total <= 0) return '#e2e8f0';
  let cur = 0;
  const stops = slices.map((s) => {
    const start = (cur / total) * 100;
    cur += s.pct;
    const end = (cur / total) * 100;
    return `${s.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

function buildPieLabels(slices: Slice[], total: number, size: number) {
  let start = 0;
  const candidates = slices.flatMap((slice, order) => {
    const midpoint = start + slice.pct / 2;
    start += slice.pct;
    if (total <= 0 || slice.pct / total < 0.08) return [];
    const angle = (midpoint / total) * Math.PI * 2 - Math.PI / 2;
    const fullLabel = slice.shortLabel || slice.name;
    const label = fullLabel.length > 5 ? `${fullLabel.slice(0, 4)}…` : fullLabel;
    const width = Math.max(label.length * 5.5, 29);
    const radius = size * (order % 2 === 0 ? 0.36 : 0.46);
    return [{
      slice,
      x: Math.max(width / 2 + 2, Math.min(size - width / 2 - 2, size / 2 + Math.cos(angle) * radius)),
      y: Math.max(18, Math.min(size - 18, size / 2 + Math.sin(angle) * radius)),
      label,
      order,
      width,
      textColor: slice.id === '__unallocated__' ? '#0f172a' : '#ffffff',
    }];
  });
  const placed: typeof candidates = [];
  for (const candidate of [...candidates].sort((a, b) => b.slice.pct - a.slice.pct)) {
    const overlaps = placed.some((other) =>
      Math.abs(candidate.x - other.x) < (candidate.width + other.width) / 2 + 2 &&
      Math.abs(candidate.y - other.y) < 22,
    );
    if (!overlaps) placed.push(candidate);
  }
  return placed.sort((a, b) => a.order - b.order);
}

export default function AllocationPreview({
  evaluation,
  marketMinimumShares = DEFAULT_MARKET_MINIMUM_SHARES,
  onMarketMinimumSharesChange,
}: {
  evaluation: PortfolioValuation;
  marketMinimumShares?: MarketMinimumShares;
  onMarketMinimumSharesChange?: (value: MarketMinimumShares) => void;
}) {
  const { holdings = [], totalAssetsTwd = 0, totalCashTwd, complete, cashTargetWeightPct } = evaluation;
  const [gapThreshold, setGapThreshold] = React.useState(savedThreshold);
  const [thresholdInput, setThresholdInput] = React.useState(() => String(savedThreshold()));
  const [minimumInputs, setMinimumInputs] = React.useState<Record<Market, string>>(() => Object.fromEntries(
    (Object.keys(DEFAULT_MARKET_MINIMUM_SHARES) as Market[]).map((market) => [market, String(marketMinimumShares[market])]),
  ) as Record<Market, string>);
  React.useEffect(() => setMinimumInputs(Object.fromEntries(
    (Object.keys(DEFAULT_MARKET_MINIMUM_SHARES) as Market[]).map((market) => [market, String(marketMinimumShares[market])]),
  ) as Record<Market, string>), [marketMinimumShares]);

  const updateThreshold = (raw: string) => {
    setThresholdInput(raw);
    const value = Number(raw);
    if (!raw.trim() || !validThreshold(value)) return;
    setGapThreshold(value);
    try {
      window.localStorage.setItem(GAP_STORAGE_KEY, String(value));
    } catch {
      // The setting still applies to this session.
    }
  };

  const colorMap = React.useMemo(() => {
    const map = new Map<string, string>();
    holdings.forEach((h, i) => {
      const key = `${h.instrument.market}:${h.instrument.symbol}`;
      const color = i < ALLOCATION_PALETTE.length ? ALLOCATION_PALETTE[i] : `hsl(${(i * 137.5) % 360}, 65%, 48%)`;
      map.set(key, color);
    });
    return map;
  }, [holdings]);

  // 目標配置 Slices
  const targetSlices: Slice[] = [];
  let targetSum = 0;
  holdings.forEach((h) => {
    const pct = h.instrument.targetWeightPct ?? 0;
    if (pct > 0) {
      targetSum += pct;
      const key = `${h.instrument.market}:${h.instrument.symbol}`;
      targetSlices.push({
        id: key,
        name: h.instrument.name || h.instrument.symbol,
        pct,
        color: colorMap.get(key) || '#94a3b8',
        shortLabel: h.instrument.symbol,
      });
    }
  });

  const resolvedCashTarget = cashTargetWeightPct ?? 0;
  const unallocatedTarget = Math.max(0, 100 - targetSum - resolvedCashTarget);

  if (resolvedCashTarget > 0) {
    targetSlices.push({
      id: '__cash__',
      name: '現金',
      pct: resolvedCashTarget,
      color: CASH_COLOR,
    });
  }
  if (unallocatedTarget > 0) targetSlices.push({
    id: '__unallocated__', name: '未配置', pct: unallocatedTarget, color: '#cbd5e1',
  });
  const totalTargetWeight = targetSlices.reduce((sum, s) => sum + s.pct, 0);
  const pieSize = 136;
  const targetPieLabels = buildPieLabels(targetSlices, totalTargetWeight, pieSize);

  // 目前配置 Slices
  const isCurrentValid = Boolean(complete && totalAssetsTwd > 0);
  const currentSlices: Slice[] = [];

  if (isCurrentValid) {
    holdings.forEach((h) => {
      const pct =
        h.currentWeightPct ??
        (h.currentValueTwd != null && totalAssetsTwd > 0
          ? (h.currentValueTwd / totalAssetsTwd) * 100
          : 0);
      if (pct > 0) {
        const key = `${h.instrument.market}:${h.instrument.symbol}`;
        currentSlices.push({
          id: key,
          name: h.instrument.name || h.instrument.symbol,
          pct,
          color: colorMap.get(key) || '#94a3b8',
          shortLabel: h.instrument.symbol,
        });
      }
    });

    const currentHoldingsSum = currentSlices.reduce((sum, s) => sum + s.pct, 0);
    const cashPct =
      totalCashTwd != null && totalAssetsTwd > 0
        ? (totalCashTwd / totalAssetsTwd) * 100
        : Math.max(0, 100 - currentHoldingsSum);

    if (cashPct > 0) {
      currentSlices.push({
        id: '__cash__',
        name: '現金',
        pct: cashPct,
        color: CASH_COLOR,
      });
    }
  }
  const totalCurrentWeight = currentSlices.reduce((sum, s) => sum + s.pct, 0);
  const currentPieLabels = buildPieLabels(currentSlices, totalCurrentWeight, pieSize);

  const currentPctById = new Map(currentSlices.map((s) => [s.id, s.pct]));
  const targetLegendRows: TargetLegendRow[] = holdings.flatMap((h) => {
    const id = `${h.instrument.market}:${h.instrument.symbol}`;
    const pct = h.instrument.targetWeightPct ?? 0;
    const currentPct = isCurrentValid ? (currentPctById.get(id) ?? 0) : undefined;
    if (pct <= 0 && h.instrument.quantity <= 0) return [];
    return [{
      id,
      name: h.instrument.name || h.instrument.symbol,
      symbol: h.instrument.symbol,
      unrealizedPlPct: h.unrealizedPlPct,
      pct,
      color: colorMap.get(id) || '#94a3b8',
      currentPct,
      gapPct: currentPct === undefined ? undefined : pct - currentPct,
      currentLabel: '目前',
      market: h.instrument.market,
      minimumShares: marketMinimumShares[h.instrument.market],
      suggestedShares: recommendWholeShareTrade(h.differenceNative, h.quote?.price, marketMinimumShares[h.instrument.market])?.shares,
    }];
  });
  const currentCashPct = isCurrentValid ? (currentPctById.get('__cash__') ?? 0) : undefined;
  if (resolvedCashTarget > 0 || (currentCashPct !== undefined && currentCashPct > 0)) {
    targetLegendRows.push({
      id: '__cash__',
      name: '現金',
      pct: resolvedCashTarget,
      color: CASH_COLOR,
      currentPct: currentCashPct,
      gapPct: currentCashPct === undefined ? undefined : resolvedCashTarget - currentCashPct,
      currentLabel: '實際現金',
    });
  }
  if (unallocatedTarget > 0) targetLegendRows.push({
    id: '__unallocated__', name: '未配置', pct: unallocatedTarget, color: '#cbd5e1', unallocated: true,
  });

  const overinvestedRows = targetLegendRows
    .filter((row) => !row.unallocated && row.gapPct !== undefined && row.gapPct < -0.05)
    .sort((a, b) => Math.abs(b.gapPct!) - Math.abs(a.gapPct!));
  const underinvestedRows = targetLegendRows
    .filter((row) => !row.unallocated && row.gapPct !== undefined && row.gapPct > 0.05)
    .sort((a, b) => b.gapPct! - a.gapPct!);
  const balancedRows = targetLegendRows.filter((row) => !row.unallocated && row.gapPct !== undefined && Math.abs(row.gapPct) <= 0.05);
  const unvaluedRows = targetLegendRows.filter((row) => !row.unallocated && row.gapPct === undefined);
  const unallocatedRows = targetLegendRows.filter((row) => row.unallocated);

  const comparisonRows: Array<Slice & { currentPct?: number; targetPct?: number }> = holdings.flatMap((h) => {
    const id = `${h.instrument.market}:${h.instrument.symbol}`;
    const currentPct = isCurrentValid ? (currentPctById.get(id) ?? 0) : undefined;
    const targetPct = h.instrument.targetWeightPct ?? 0;
    if ((currentPct ?? 0) <= 0 && targetPct <= 0 && h.instrument.quantity <= 0) return [];
    return [{ id, name: h.instrument.name || h.instrument.symbol, shortLabel: h.instrument.symbol,
      pct: targetPct, targetPct, currentPct, color: colorMap.get(id) || '#94a3b8' }];
  });
  if (resolvedCashTarget > 0 || (currentCashPct ?? 0) > 0) comparisonRows.push({
    id: '__cash__', name: '現金', pct: resolvedCashTarget, targetPct: resolvedCashTarget,
    currentPct: currentCashPct, color: CASH_COLOR,
  });
  if (unallocatedTarget > 0) comparisonRows.push({
    id: '__unallocated__', name: '未配置', pct: unallocatedTarget, targetPct: unallocatedTarget,
    color: '#cbd5e1',
  });

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 12,
    boxSizing: 'border-box',
    minWidth: 0,
  };

  const pieCircleStyle: React.CSSProperties = {
    width: pieSize,
    height: pieSize,
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
  };

  const renderComparisonLegend = () => (
    <ul
      style={{
        listStyle: 'none', margin: '10px 0 0', padding: 0,
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 64px 64px', gap: '4px 8px',
        alignItems: 'center', fontSize: 11,
      }}
    >
      <li style={{ color: '#64748b', fontWeight: 600 }}>資產</li>
      <li style={{ color: '#64748b', textAlign: 'right', fontWeight: 600 }}>目前</li>
      <li style={{ color: '#64748b', textAlign: 'right', fontWeight: 600 }}>目標</li>
      {comparisonRows.map((row) => (
        <React.Fragment key={row.id}>
          <li style={{ display: 'contents' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, color: '#334155' }} title={row.name}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: row.color, flexShrink: 0 }} aria-hidden="true" />
              <span style={{ overflowWrap: 'anywhere' }}>{row.name}</span>
            </span>
            <span style={{ textAlign: 'right', fontWeight: 600, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
              {row.currentPct === undefined ? '—' : `${row.currentPct.toFixed(1)}%`}
            </span>
            <span style={{ textAlign: 'right', fontWeight: 600, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
              {row.targetPct?.toFixed(1)}%
            </span>
          </li>
        </React.Fragment>
      ))}
    </ul>
  );

  const renderTargetLegendRows = (rows: TargetLegendRow[]) => (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
      {rows.map((row) => {
        const alertLevel = rebalanceAlertLevel(row.gapPct, gapThreshold, row.suggestedShares, row.minimumShares ?? 1, row.id === '__cash__');
        const alert = alertLevel === 'actionable';
        const caution = alertLevel === 'caution';
        const alertColor = alert ? '#b91c1c' : '#a16207';
        const gapText = row.unallocated ? '尚未分配' : row.gapPct === undefined
          ? (complete ? '差距：尚無資產' : '差距：估值不完整')
          : Math.abs(row.gapPct) < 0.05
            ? '已達目標'
            : row.gapPct > 0
              ? `還差 ${row.gapPct.toFixed(1)} 個百分點`
              : `超出 ${Math.abs(row.gapPct).toFixed(1)} 個百分點`;
        return (
          <li
            key={row.id}
            style={{
              padding: '5px 6px', borderRadius: 6,
              backgroundColor: alert ? '#fef2f2' : caution ? '#fffbeb' : '#f8fafc',
              border: `1px solid ${alert ? '#fecaca' : caution ? '#fde68a' : '#e2e8f0'}`,
              color: alert ? '#b91c1c' : caution ? '#92400e' : '#334155',
              fontSize: 11, lineHeight: 1.4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, minWidth: 0 }}>
              <span
                style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: row.color, flexShrink: 0 }}
                aria-hidden="true"
              />
              {row.symbol && <strong style={{ flexShrink: 0 }}>{row.symbol}</strong>}
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.name}>
                {row.name}
              </span>
              {row.symbol && <span
                aria-label={`未實現報酬率 ${row.unrealizedPlPct === undefined ? '無資料' : `${row.unrealizedPlPct >= 0 ? '+' : ''}${row.unrealizedPlPct.toFixed(1)}%`}`}
                title="未實現報酬率（相對於持倉成本）"
                style={{ flexShrink: 0, marginLeft: 'auto', color: row.unrealizedPlPct === undefined ? '#64748b' : row.unrealizedPlPct > 0 ? '#dc2626' : row.unrealizedPlPct < 0 ? '#16a34a' : '#64748b', fontVariantNumeric: 'tabular-nums' }}
              >
                {row.unrealizedPlPct === undefined ? '報酬 —' : `報酬 ${row.unrealizedPlPct >= 0 ? '+' : ''}${row.unrealizedPlPct.toFixed(1)}%`}
              </span>}
              {(alert || caution) && <strong style={{ marginLeft: 'auto', flexShrink: 0, color: alertColor }}>{alert ? '優先處理' : `差距未達 ${row.minimumShares} 股`}</strong>}
            </div>
            <div style={{ paddingLeft: 14, fontVariantNumeric: 'tabular-nums' }}>
              目標 {row.pct.toFixed(1)}% · {row.currentLabel ?? '目前'} {row.currentPct === undefined ? '—' : `${row.currentPct.toFixed(1)}%`}
              <br />
              {gapText}
              {caution && <><br /><span style={{ color: alertColor }}>比例已超過警示值，但估算差距不足最低操作量（{row.minimumShares} 股）</span></>}
            </div>
          </li>
        );
      })}
    </ul>
  );

  const renderTargetLegend = () => {
    const groups = [
      ['投入過多', overinvestedRows],
      ['投入過少', underinvestedRows],
      ['已達目標', balancedRows],
      [complete ? '差距未計算' : '估值未完整', unvaluedRows],
      ['未配置', unallocatedRows],
    ] as const;
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 150 }}>
      {groups.filter(([, rows]) => rows.length > 0).map(([label, rows]) => (
        <section key={label} aria-label={label}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>{label}</div>
          {renderTargetLegendRows(rows)}
        </section>
      ))}
    </div>;
  };

  return (
    <section
      aria-label="資產配置預覽"
      style={{
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ ...cardStyle, width: '100%', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>資產配置比較</div>
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
          兩側使用相同標的顏色；小扇區的精確比例列於下方圖例。
        </div>
        <div className="allocation-pie-pair">
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', textAlign: 'center' }}>目前配置</div>
            {isCurrentValid && currentSlices.length > 0 ? (
              <div
                role="img"
                aria-label={`目前配置：${currentSlices.map((s) => `${s.name} ${s.pct.toFixed(1)}%`).join('、')}`}
                style={{ ...pieCircleStyle, position: 'relative', margin: '10px auto 2px', background: buildGradient(currentSlices, totalCurrentWeight) }}
              >
                <svg aria-hidden="true" viewBox={`0 0 ${pieSize} ${pieSize}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                  {currentPieLabels.map(({ slice, x, y, label, textColor }) => (
                    <g key={slice.id} textAnchor="middle" fontSize="9" fontWeight="700" fill={textColor} stroke={slice.id === '__unallocated__' ? '#ffffff' : 'rgba(15,23,42,0.7)'} strokeWidth="2.5" paintOrder="stroke">
                      <title>{`${slice.name} ${slice.pct.toFixed(1)}%`}</title>
                      <text x={x} y={y - 3}>{label}</text>
                      <text x={x} y={y + 9}>{slice.pct.toFixed(1)}%</text>
                    </g>
                  ))}
                </svg>
              </div>
            ) : (
              <div role="img" aria-label={complete ? '目前配置：尚無資產' : '目前配置：估值不完整'} style={{ ...pieCircleStyle, margin: '10px auto 2px', border: '2px dashed #cbd5e1', backgroundColor: '#f8fafc', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 8, boxSizing: 'border-box', fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                {complete ? '尚無資產' : '估值不完整'}
              </div>
            )}
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', textAlign: 'center' }}>目標配置</div>
            {targetSlices.length > 0 ? (
              <div
                role="img"
                aria-label={`目標配置：${targetSlices.map((s) => `${s.name} ${s.pct.toFixed(1)}%`).join('、')}`}
                style={{ ...pieCircleStyle, position: 'relative', margin: '10px auto 2px', background: buildGradient(targetSlices, totalTargetWeight) }}
              >
                <svg aria-hidden="true" viewBox={`0 0 ${pieSize} ${pieSize}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                  {targetPieLabels.map(({ slice, x, y, label, textColor }) => (
                    <g key={slice.id} textAnchor="middle" fontSize="9" fontWeight="700" fill={textColor} stroke={slice.id === '__unallocated__' ? '#ffffff' : 'rgba(15,23,42,0.7)'} strokeWidth="2.5" paintOrder="stroke">
                      <title>{`${slice.name} ${slice.pct.toFixed(1)}%`}</title>
                      <text x={x} y={y - 3}>{label}</text>
                      <text x={x} y={y + 9}>{slice.pct.toFixed(1)}%</text>
                    </g>
                  ))}
                </svg>
              </div>
            ) : (
              <div role="img" aria-label="目標配置：尚無設定" style={{ ...pieCircleStyle, margin: '10px auto 2px', border: '2px dashed #cbd5e1', backgroundColor: '#f8fafc', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 8, boxSizing: 'border-box', fontSize: 11, color: '#64748b' }}>
                尚無設定
              </div>
            )}
          </div>
        </div>
        {renderComparisonLegend()}
        <div aria-label={`尚未配置 ${unallocatedTarget.toFixed(1)}%`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14, padding: '10px 12px', border: '1px solid #fdba74', borderRadius: 8, background: '#fff7ed' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9a3412' }}>尚未配置</div>
            <div style={{ fontSize: 10, color: '#9a3412', marginTop: 2 }}>未指派至股票或現金目標</div>
          </div>
          <strong style={{ fontSize: 24, lineHeight: 1, color: '#9a3412', fontVariantNumeric: 'tabular-nums' }}>{unallocatedTarget.toFixed(1)}%</strong>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 10, fontSize: 11, color: '#475569' }}>
          再平衡警示門檻（百分點）
          <input
            type="number"
            min="0.1"
            max="100"
            step="0.1"
            value={thresholdInput}
            onChange={(event) => updateThreshold(event.target.value)}
            onBlur={() => { if (!validThreshold(Number(thresholdInput))) setThresholdInput(String(gapThreshold)); }}
            style={{ width: 65, padding: '3px 5px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
          />
          <span style={{ color: '#64748b' }}>達門檻時標紅</span>
        </label>
        <fieldset style={{ border: 0, padding: 0, margin: '10px 0 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 10px', fontSize: 11, color: '#475569' }}>
          <legend style={{ padding: 0, marginBottom: 4, fontWeight: 600 }}>各市場最低操作股數</legend>
          {([['TW', '台股'], ['TWO', '上櫃'], ['US', '美股'], ['JP', '日股']] as const).map(([market, label]) => (
            <label key={market} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {label}
              <input aria-label={`${label}最低操作股數`} type="number" min="1" max="1000000" step="1" value={minimumInputs[market]}
                onChange={(event) => {
                  const raw = event.target.value;
                  setMinimumInputs((current) => ({ ...current, [market]: raw }));
                  const value = Number(raw);
                  if (raw.trim() && Number.isInteger(value) && value >= 1 && value <= 1_000_000) onMarketMinimumSharesChange?.({ ...marketMinimumShares, [market]: value });
                }}
                onBlur={() => {
                  const value = Number(minimumInputs[market]);
                  if (!Number.isInteger(value) || value < 1 || value > 1_000_000) setMinimumInputs((current) => ({ ...current, [market]: String(marketMinimumShares[market]) }));
                }}
                style={{ width: 60, padding: '3px 5px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }} />
            </label>
          ))}
          <span style={{ color: '#64748b' }}>預設：台股／美股 1 股，日股 100 股</span>
        </fieldset>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginTop: 12, marginBottom: 5 }}>再平衡差距</div>
        {renderTargetLegend()}
      </div>
    </section>
  );
}
