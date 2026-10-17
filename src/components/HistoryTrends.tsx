import type { DailySnapshot } from '../lib/history';

const COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#ea580c', '#64748b', '#4f46e5', '#0d9488'];
const fmt = (value: number) => new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(value);

export default function HistoryTrends({ snapshots, source, onRetry, error }: {
  snapshots: DailySnapshot[];
  source: 'local' | 'demo';
  onRetry?: () => void;
  error?: string | null;
}) {
  const rows = snapshots.slice(-30);
  const width = 720;
  const chartHeight = 180;
  const pad = { left: 58, right: 12, top: 12, bottom: 26 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = chartHeight - pad.top - pad.bottom;
  const values = rows.map((row) => row.totalAssetsTwd);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.max(1, max * 0.05);
  const x = (index: number) => pad.left + (rows.length <= 1 ? plotWidth / 2 : index / (rows.length - 1) * plotWidth);
  const y = (value: number) => pad.top + (max === min ? plotHeight / 2 : (max - value) / range * plotHeight);
  const line = rows.map((row, i) => `${x(i)},${y(row.totalAssetsTwd)}`).join(' ');
  const keys = [...new Set(rows.flatMap((row) => row.allocations.map((item) => item.key)))];
  const labels = new Map(rows.flatMap((row) => row.allocations.map((item) => [item.key, item.label] as const)));
  const color = (key: string) => COLORS[keys.indexOf(key) % COLORS.length];

  return <section aria-label="每日資產歷史趨勢" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, minWidth: 0 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
      <div>
        <h2 style={{ fontSize: 18, margin: 0 }}>每日資產趨勢</h2>
        <p style={{ fontSize: 12, color: '#64748b', margin: '5px 0 0' }}>
          {source === 'local' ? '本機紀錄只保存在這個瀏覽器' : '示範模式不會新增或保存紀錄'} · 最近 {rows.length} 筆
        </p>
      </div>
    </div>
    {error && <div role="alert" style={{ marginTop: 12, color: '#92400e', background: '#fffbeb', borderRadius: 6, padding: 10, fontSize: 13 }}>
      {error} {onRetry && <button type="button" className="secondary-button" onClick={onRetry}>重試紀錄</button>}
    </div>}
    {rows.length === 0 ? <div style={{ marginTop: 16, padding: '24px 14px', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 8, color: '#64748b', fontSize: 14 }}>
      {source === 'demo' ? '切回本機資料後，完整估值會開始累積每日紀錄。' : '目前沒有歷史資料。資料完整時，系統會從今日開始記錄。'}
    </div> : <>
      <div style={{ marginTop: 16, fontSize: 13, fontWeight: 650, color: '#334155' }}>總資產（新台幣）</div>
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${chartHeight}`} role="img" aria-label={`最近${rows.length}筆每日總資產趨勢`} style={{ width: '100%', minWidth: 320, display: 'block' }}>
          {[0, 0.5, 1].map((fraction) => {
            const val = max - range * fraction;
            const yy = pad.top + plotHeight * fraction;
            return <g key={fraction}><line x1={pad.left} x2={width - pad.right} y1={yy} y2={yy} stroke="#e2e8f0" />
              <text x={pad.left - 8} y={yy + 4} textAnchor="end" fontSize="10" fill="#64748b">{fmt(val)}</text></g>;
          })}
          {rows.length > 1 && <polyline points={line} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
          {rows.map((row, i) => <g key={row.date}><circle cx={x(i)} cy={y(row.totalAssetsTwd)} r="4" fill="#2563eb"><title>{row.date}：NT$ {fmt(row.totalAssetsTwd)}</title></circle>
            {(i === 0 || i === rows.length - 1 || rows.length <= 5) && <text x={x(i)} y={chartHeight - 5} textAnchor="middle" fontSize="10" fill="#64748b">{row.date.slice(5)}</text>}</g>)}
        </svg>
      </div>
      <div style={{ marginTop: 4, fontSize: 13, fontWeight: 650, color: '#334155' }}>每日配置比例（堆疊 100%）</div>
      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        {rows.slice(-14).map((row) => <div key={row.date} style={{ display: 'grid', gridTemplateColumns: '74px minmax(0,1fr) 110px', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{row.date}</span>
          <div role="img" aria-label={`${row.date}配置：${row.allocations.map((item) => `${item.label} ${item.weightPct.toFixed(1)}%`).join('、')}`} style={{ display: 'flex', height: 14, overflow: 'hidden', borderRadius: 4, background: '#f1f5f9' }}>
            {row.allocations.filter((item) => item.weightPct > 0).map((item) => <span key={item.key} title={`${item.label} ${item.weightPct.toFixed(1)}%`} style={{ width: `${item.weightPct}%`, backgroundColor: color(item.key), minWidth: item.weightPct > 0 ? 1 : 0 }} />)}
          </div>
          <span style={{ textAlign: 'right', fontSize: 11, color: '#334155', fontVariantNumeric: 'tabular-nums' }}>NT$ {fmt(row.totalAssetsTwd)}</span>
        </div>)}
      </div>
      <div aria-label="資產配置圖例" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 12 }}>
        {keys.map((key) => <span key={key} style={{ display: 'inline-flex', gap: 5, alignItems: 'center', color: '#475569', fontSize: 11 }}><i aria-hidden="true" style={{ background: color(key), borderRadius: 2, width: 9, height: 9 }} />{labels.get(key)}</span>)}
      </div>
    </>}
  </section>;
}
