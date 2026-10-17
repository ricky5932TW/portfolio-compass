import React, { useState, useEffect, useMemo, useRef } from 'react';
import AllocationPreview, { ALLOCATION_PALETTE } from './components/AllocationPreview';
import HistoryTrends from './components/HistoryTrends';
import { buildDailySnapshot, isDailySnapshot, parseDailyHistory, taipeiDate, upsertDailySnapshot, type DailySnapshot } from './lib/history';
import {
  Market,
  Currency,
  Instrument,
  PortfolioDocument,
  MarketSnapshot,
  validatePortfolioDocument,
  evaluatePortfolio,
  createManualQuote,
  recommendWholeShareTrade,
  DEFAULT_MARKET_MINIMUM_SHARES,
  MARKET_MINIMUM_SHARES_KEY,
  loadMarketMinimumShares,
  scaleAllocationPercent,
  type MarketMinimumShares,
  targetPriceGapPct,
  targetPriceGapFromCostPct
} from './lib/portfolio';

const STORAGE_PORTFOLIO_REAL = 'portfolio-visualizer-v1:portfolio';
const STORAGE_SNAPSHOT_REAL = 'portfolio-visualizer-v1:market';
const STORAGE_HISTORY_REAL = 'portfolio-visualizer-v1:history';

const NATIVE_CURRENCIES: Record<Market, Currency> = {
  TW: 'TWD',
  TWO: 'TWD',
  US: 'USD',
  JP: 'JPY'
};

const INITIAL_REAL_DOC: PortfolioDocument = {
  holdings: [],
  cash: { TWD: 0, USD: 0, JPY: 0 },
  targetCashWeightPct: 0
};

const INITIAL_REAL_SNAPSHOT: MarketSnapshot = {
  quotes: [],
  fx: null,
  errors: []
};

const DEMO_DOC: PortfolioDocument = {
  holdings: [
    { market: 'TW', symbol: '2330', name: '台積電', averageCost: 880, quantity: 2000, targetWeightPct: 35 },
    { market: 'TW', symbol: '0050', name: '元大台灣50', averageCost: 165, quantity: 5000, targetWeightPct: 25 },
    { market: 'US', symbol: 'AAPL', name: 'Apple Inc.', averageCost: 195, quantity: 50, targetWeightPct: 20 },
    { market: 'JP', symbol: '7203', name: 'Toyota Motor', averageCost: 2850, quantity: 200, targetWeightPct: 10 }
  ],
  cash: { TWD: 250000, USD: 3000, JPY: 150000 },
  targetCashWeightPct: 10
};

const DEMO_SNAPSHOT: MarketSnapshot = {
  quotes: [
    { market: 'TW', symbol: '2330', currency: 'TWD', price: 980, asOf: '2024-01-01', source: '示範資料' },
    { market: 'TW', symbol: '0050', currency: 'TWD', price: 182.5, asOf: '2024-01-01', source: '示範資料' },
    { market: 'US', symbol: 'AAPL', currency: 'USD', price: 228.4, asOf: '2024-01-01', source: '示範資料' },
    { market: 'JP', symbol: '7203', currency: 'JPY', price: 3120, asOf: '2024-01-01', source: '示範資料' }
  ],
  fx: {
    base: 'TWD',
    rates: { TWD: 1, USD: 32.2, JPY: 0.218 },
    asOf: '2024-01-01',
    source: '示範資料'
  },
  errors: []
};

function isSavedSnapshot(input: unknown): input is MarketSnapshot {
  if (!input || typeof input !== 'object') return false;
  const value = input as Partial<MarketSnapshot>;
  return Array.isArray(value.quotes) && value.quotes.every((q) =>
    q && typeof q.symbol === 'string' && typeof q.market === 'string' &&
    Number.isFinite(q.price) && typeof q.asOf === 'string' && typeof q.source === 'string') &&
    (value.fx === null || !!(value.fx?.rates && Number.isFinite(value.fx.rates.USD) &&
      Number.isFinite(value.fx.rates.JPY) && typeof value.fx.asOf === 'string')) &&
    Array.isArray(value.errors);
}

const localDay = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });

function isDataStale(asOfString?: string): boolean {
  if (!asOfString) return true;
  const date = new Date(asOfString);
  if (isNaN(date.getTime())) return true;
  const diffTime = Math.abs(Date.now() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 3;
}

function formatCurrency(num?: number, fractionDigits = 0): string {
  if (num === undefined || isNaN(num)) return '--';
  return new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(num);
}

function formatPct(num?: number): string {
  if (num === undefined || isNaN(num)) return '--';
  return `${num.toFixed(1)}%`;
}

function formatSignedCurrency(num?: number): string {
  if (num === undefined || !Number.isFinite(num)) return '--';
  return `${num > 0 ? '+' : ''}${formatCurrency(num, 2)}`;
}

export default function App() {
  const [mode, setMode] = useState<'real' | 'demo'>('real');
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyRetry, setHistoryRetry] = useState(0);
  const [historyDate, setHistoryDate] = useState(() => taipeiDate());
  const [realDoc, setRealDoc] = useState<PortfolioDocument>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PORTFOLIO_REAL);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (validatePortfolioDocument(parsed).length === 0) return parsed as PortfolioDocument;
      }
    } catch (e) {
      console.error('Failed to load saved portfolio', e);
    }
    return INITIAL_REAL_DOC;
  });

  const [realSnapshot, setRealSnapshot] = useState<MarketSnapshot>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SNAPSHOT_REAL);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isSavedSnapshot(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load saved market data', e);
    }
    return INITIAL_REAL_SNAPSHOT;
  });
  const [realHistory, setRealHistory] = useState<DailySnapshot[]>(() => {
    try { return parseDailyHistory(JSON.parse(localStorage.getItem(STORAGE_HISTORY_REAL) ?? '[]')); }
    catch { return []; }
  });
  const [marketMinimumShares, setMarketMinimumShares] = useState<MarketMinimumShares>(loadMarketMinimumShares);
  const [manualPriceDrafts, setManualPriceDrafts] = useState<Record<string, { price: string; asOf: string }>>({});
  const importFileRef = useRef<HTMLInputElement>(null);

  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  // Holding Form State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formMarket, setFormMarket] = useState<Market>('TW');
  const [formSymbol, setFormSymbol] = useState('');
  const [formName, setFormName] = useState('');
  const [formAvgCost, setFormAvgCost] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formTargetWeight, setFormTargetWeight] = useState('');
  const [formLongTermTargetPrice, setFormLongTermTargetPrice] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Cash Form State
  const [editCashTargetPct, setEditCashTargetPct] = useState('0');
  const [editCashBalances, setEditCashBalances] = useState({ TWD: '0', USD: '0', JPY: '0' });
  const [cashSaveNotice, setCashSaveNotice] = useState(false);
  const [cashError, setCashError] = useState<string | null>(null);

  // Active document and snapshot based on mode
  const currentDoc = mode === 'demo' ? DEMO_DOC : realDoc;
  const currentSnapshot = mode === 'demo' ? DEMO_SNAPSHOT : realSnapshot;
  const currentHistory = mode === 'demo' ? [] : realHistory;

  const updateActiveDocument = (update: (previous: PortfolioDocument) => PortfolioDocument) => {
    if (mode !== 'demo') setRealDoc(update);
  };

  useEffect(() => {
    const timer = window.setInterval(() => setHistoryDate(taipeiDate()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Persistence for Real Mode
  useEffect(() => {
    if (mode === 'real') {
      localStorage.setItem(STORAGE_PORTFOLIO_REAL, JSON.stringify(realDoc));
    }
  }, [realDoc, mode]);

  useEffect(() => {
    if (mode === 'real') {
      localStorage.setItem(STORAGE_SNAPSHOT_REAL, JSON.stringify(realSnapshot));
    }
  }, [realSnapshot, mode]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_HISTORY_REAL, JSON.stringify(realHistory)); }
    catch { setHistoryError('無法寫入本機歷史紀錄，請檢查瀏覽器儲存空間。'); }
  }, [realHistory]);

  // Evaluate Portfolio
  const evaluation = useMemo(() => {
    return evaluatePortfolio(currentDoc, currentSnapshot);
  }, [currentDoc, currentSnapshot]);

  const targetAllocationSummary = useMemo(() => {
    const parts = currentDoc.holdings.flatMap((instrument, index) => instrument.targetWeightPct > 0 ? [{
      id: `${instrument.market}:${instrument.symbol}`,
      label: instrument.symbol,
      pct: instrument.targetWeightPct,
      color: index < ALLOCATION_PALETTE.length ? ALLOCATION_PALETTE[index] : `hsl(${(index * 137.5) % 360}, 65%, 48%)`,
    }] : []);
    const cashTargetPct = currentDoc.targetCashWeightPct ?? 0;
    if (cashTargetPct > 0) parts.push({ id: '__cash__', label: '現金', pct: cashTargetPct, color: 'var(--text-muted)' });
    const assigned = parts.reduce((sum, part) => sum + part.pct, 0);
    const unallocatedPct = Math.max(0, 100 - assigned);
    if (unallocatedPct > 0) parts.push({ id: '__unallocated__', label: '未配置', pct: unallocatedPct, color: 'var(--border-strong)' });
    return { parts, unallocatedPct };
  }, [currentDoc]);
  useEffect(() => {
    setEditCashTargetPct(String(currentDoc.targetCashWeightPct ?? 0));
    setEditCashBalances({ TWD: String(currentDoc.cash.TWD), USD: String(currentDoc.cash.USD), JPY: String(currentDoc.cash.JPY) });
  }, [currentDoc.targetCashWeightPct, currentDoc.cash.TWD, currentDoc.cash.USD, currentDoc.cash.JPY]);

  useEffect(() => {
    if (mode !== 'real') return;
    const snapshot = buildDailySnapshot(evaluation, historyDate, currentDoc.cash, currentSnapshot.fx?.rates);
    if (!snapshot) return;
    setRealHistory((previous) => {
      const next = upsertDailySnapshot(previous, snapshot);
      return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
    });
    setHistoryError(null);
  }, [mode, evaluation, currentDoc.cash, currentSnapshot.fx, historyDate, historyRetry]);

  const retryHistory = () => setHistoryRetry((value) => value + 1);

  const saveManualPrice = (index: number) => {
    const instrument = currentDoc.holdings[index];
    if (!instrument) return;
    const key = `${instrument.market}:${instrument.symbol.toUpperCase()}`;
    const draft = manualPriceDrafts[key];
    const quote = createManualQuote(instrument.market, instrument.symbol, Number(draft?.price), draft?.asOf || '');
    if (!quote) { alert('請輸入大於零的有效價格及有效日期（YYYY-MM-DD）。'); return; }
    updateActiveDocument(prev => ({ ...prev, holdings: prev.holdings.map((h, i) => i === index ? { ...h, manualPriceOverride: quote } : h) }));
  };

  const clearManualPrice = (index: number) => updateActiveDocument(prev => ({ ...prev, holdings: prev.holdings.map((h, i) => i === index ? (({ manualPriceOverride, ...rest }) => rest)(h) : h) }));

  // Validation errors in Portfolio Document
  const docValidationErrors = useMemo(() => {
    return validatePortfolioDocument(currentDoc);
  }, [currentDoc]);

  // Reset / Open Holding Form
  const startAddHolding = () => {
    setEditingIndex(null);
    setFormMarket('TW');
    setFormSymbol('');
    setFormName('');
    setFormAvgCost('');
    setFormQuantity('');
    setFormTargetWeight('');
    setFormLongTermTargetPrice('');
    setFormError(null);
  };

  const startEditHolding = (index: number) => {
    const item = currentDoc.holdings[index];
    if (!item) return;
    setEditingIndex(index);
    setFormMarket(item.market);
    setFormSymbol(item.symbol);
    setFormName(item.name);
    setFormAvgCost(String(item.averageCost));
    setFormQuantity(String(item.quantity));
    setFormTargetWeight(String(item.targetWeightPct));
    setFormLongTermTargetPrice(item.longTermTargetPrice === undefined ? '' : String(item.longTermTargetPrice));
    setFormError(null);
  };

  const handleSaveHolding = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'demo') {
      setFormError('示範模式下不支援直接修改，請切換至本機實際配置模式。');
      return;
    }

    const symbol = formSymbol.trim().toUpperCase();
    const name = formName.trim();
    const avgCost = parseFloat(formAvgCost);
    const qty = parseFloat(formQuantity);
    const weight = parseFloat(formTargetWeight);
    const longTermTargetPrice = formLongTermTargetPrice.trim() === '' ? undefined : Number(formLongTermTargetPrice);

    if (!symbol) {
      setFormError('請輸入代號 (Symbol)');
      return;
    }
    if (!name) {
      setFormError('請輸入標的名稱');
      return;
    }
    if (isNaN(avgCost) || avgCost < 0) {
      setFormError('請輸入有效的平均成本 (必須大於等於 0)');
      return;
    }
    if (isNaN(qty) || qty < 0) {
      setFormError('請輸入有效的持有數量 (必須大於等於 0)');
      return;
    }
    if (isNaN(weight) || weight < 0 || weight > 100) {
      setFormError('目標佔比需介於 0% 至 100% 之間');
      return;
    }
    if (longTermTargetPrice !== undefined && (!Number.isFinite(longTermTargetPrice) || longTermTargetPrice <= 0)) {
      setFormError('長期目標價必須大於零；不設定時請留空');
      return;
    }

    const previousInstrument = editingIndex === null ? undefined : currentDoc.holdings[editingIndex];
    const newInstrument: Instrument = {
      market: formMarket,
      symbol,
      name,
      averageCost: avgCost,
      quantity: qty,
      targetWeightPct: weight,
      ...(longTermTargetPrice === undefined ? {} : { longTermTargetPrice }),
      ...(previousInstrument?.market === formMarket && previousInstrument.symbol.toUpperCase() === symbol
        ? { manualPriceOverride: previousInstrument.manualPriceOverride }
        : {})
    };

    let updatedList = [...currentDoc.holdings];
    if (editingIndex !== null) {
      updatedList[editingIndex] = newInstrument;
    } else {
      updatedList.push(newInstrument);
    }

    const candidateDoc = { ...currentDoc, holdings: updatedList };
    const validationErrors = validatePortfolioDocument(candidateDoc);
    if (validationErrors.length > 0) { setFormError(validationErrors.join('; ')); return; }
    updateActiveDocument(() => candidateDoc);

    startAddHolding();

  };

  const handleDeleteHolding = (index: number) => {
    if (mode === 'demo') {
      alert('示範模式下無法刪除標的');
      return;
    }
    if (window.confirm(`確定要刪除 ${currentDoc.holdings[index]?.name || '此標的'} 嗎？`)) {
      updateActiveDocument((prev) => ({
        ...prev,
        holdings: prev.holdings.filter((_, i) => i !== index)
      }));
      if (editingIndex === index) {
        startAddHolding();
      }
    }
  };

  // Save Cash
  const handleSaveCash = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'demo') {
      alert('示範模式下無法直接修改現金');
      return;
    }
    const targetCashWeightPct = Number(editCashTargetPct);
    if (editCashTargetPct.trim() === '' || !Number.isFinite(targetCashWeightPct) || targetCashWeightPct < 0 || targetCashWeightPct > 100) {
      setCashError('請輸入 0% 至 100% 之間的有效現金目標比例');
      return;
    }
    const cash = { TWD: Number(editCashBalances.TWD), USD: Number(editCashBalances.USD), JPY: Number(editCashBalances.JPY) };
    if (Object.values(cash).some((amount) => !Number.isFinite(amount) || amount < 0)) {
      setCashError('實際現金金額必須是大於或等於零的有效數字。');
      return;
    }
    const next = { ...currentDoc, targetCashWeightPct, cash };
    const errors = validatePortfolioDocument(next);
    if (errors.length) {
      setCashError(errors.join('；'));
      return;
    }
    setCashError(null);

    updateActiveDocument(() => next);
    setCashSaveNotice(true);
    setTimeout(() => setCashSaveNotice(false), 2500);
  };

  // Export JSON
  const handleExportJson = () => {
    if (!window.confirm('JSON 備份會包含持倉代號、數量、成本、現金、行情快取與每日資產紀錄，且不會加密。請存放在安全位置。要匯出嗎？')) return;
    const exportData = {
      exportedAt: new Date().toISOString(),
      portfolio: currentDoc,
      snapshot: currentSnapshot,
      history: realHistory
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio_${mode}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('檔案不可超過 5 MB。');
      const parsed: unknown = JSON.parse(await file.text());
      const bundle = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
      const portfolio = bundle && 'portfolio' in bundle ? bundle.portfolio : parsed;
      const errors = validatePortfolioDocument(portfolio);
      if (errors.length) throw new Error(errors.join('；'));
      const snapshot = bundle && 'snapshot' in bundle ? bundle.snapshot : undefined;
      if (snapshot !== undefined && !isSavedSnapshot(snapshot)) throw new Error('報價資料格式錯誤，請使用 App 匯出的 JSON 備份。');
      const history = bundle && 'history' in bundle ? bundle.history : [];
      if (!Array.isArray(history) || !history.every(isDailySnapshot)) throw new Error('每日資產紀錄格式錯誤，請使用 App 匯出的 JSON 備份。');
      if (!window.confirm('匯入會取代目前這台裝置的本機持倉、現金與每日資產紀錄；行情會使用檔案內的備份（若有）。確定匯入？')) return;
      setRealDoc(portfolio as PortfolioDocument);
      setRealSnapshot(snapshot ? snapshot : INITIAL_REAL_SNAPSHOT);
      setRealHistory(parseDailyHistory(history));
      setRefreshMessage(`已匯入 ${file.name} 到本機資料`);
    } catch (error) {
      alert(`匯入失敗：${error instanceof Error ? error.message : '檔案不是有效的投資組合 JSON'}`);
    }
  };

  const handleClearLocalData = () => {
    if (!window.confirm('確定清除此瀏覽器的本機持倉、報價與歷史紀錄？此操作無法復原；如需保留，請先匯出 JSON。')) return;
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key?.startsWith('portfolio-visualizer-v1:')) localStorage.removeItem(key);
    }
    setRealDoc(INITIAL_REAL_DOC);
    setRealSnapshot(INITIAL_REAL_SNAPSHOT);
    setRealHistory([]);
    setMarketMinimumShares({ ...DEFAULT_MARKET_MINIMUM_SHARES });
    setManualPriceDrafts({});
    setEditingIndex(null);
    setFormError(null);
    setRefreshMessage('已清除此瀏覽器的本機資料');
    setEditCashTargetPct('0');
    setEditCashBalances({ TWD: '0', USD: '0', JPY: '0' });
  };

  return (
    <div className="app-shell" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-slate)', color: 'var(--text-main)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Header */}
      <header className="app-header" style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div className="brand-lockup" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={new URL('../favicon.svg', import.meta.url).href} width="36" height="36" alt="" />
            <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--brand)', letterSpacing: '-0.5px' }}>
              持倉羅盤
            </span>
            {mode === 'demo' ? (
              <span style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)', padding: '3px 10px', borderRadius: 9999, fontSize: 13, fontWeight: 700 }}>
                示範模式｜範例資料，非即時行情
              </span>
            ) : (
              <span style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)', padding: '3px 10px', borderRadius: 9999, fontSize: 13, fontWeight: 700 }}>
                資料只留在此裝置
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            {/* Mode Switcher */}
            <div style={{ display: 'flex', backgroundColor: 'var(--surface-subtle)', padding: 3, borderRadius: 8, border: '1px solid var(--border-strong)' }}>
              <button
                type="button"
                onClick={() => setMode('real')}
                style={{
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: mode === 'real' ? 700 : 500,
                  backgroundColor: mode === 'real' ? 'var(--surface-active)' : 'transparent',
                  color: mode === 'real' ? 'var(--text-main)' : 'var(--text-muted)',
                  boxShadow: mode === 'real' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer'
                }}
              >
                本機資料
              </button>
              <button
                type="button"
                onClick={() => setMode('demo')}
                style={{
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: mode === 'demo' ? 700 : 500,
                  backgroundColor: mode === 'demo' ? 'var(--surface-active)' : 'transparent',
                  color: mode === 'demo' ? 'var(--warning-text)' : 'var(--text-muted)',
                  boxShadow: mode === 'demo' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer'
                }}
              >
                檢視示範資料
              </button>
            </div>

            {/* Export JSON */}
            <button
              type="button"
              onClick={handleExportJson}
              style={{
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-strong)',
                padding: '8px 14px',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              匯出 JSON
            </button>
            {mode === 'real' && <>
              <input ref={importFileRef} type="file" accept=".json,application/json" onChange={(event) => void handleImportJson(event)} style={{ display: 'none' }} />
              <button
                type="button"
                onClick={() => importFileRef.current?.click()}
                className="secondary-button"
                title="將 App 匯出的備份或投資組合 JSON 載入本機資料。"
              >
                匯入 JSON
              </button>
            </>}
            {mode === 'real' && <button
              type="button"
              onClick={handleClearLocalData}
              className="secondary-button"
              style={{ borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}
              title="清除此瀏覽器保存的所有本機持倉、估值和歷史紀錄。"
            >
              刪除本機資料
            </button>}
          </div>
        </div>
      </header>

      <main className="portfolio-main" style={{ maxWidth: 1280, margin: '24px auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <section className="brand-hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">PRIVATE BY DESIGN · PORTFOLIO PLANNER</p>
            <h1 id="hero-title">看懂配置，<br /><span>讓每一步更有方向。</span></h1>
            <p className="hero-description">把持倉、目標比例與再平衡差距放在同一張畫面。資料只存在你的瀏覽器，備份由你自己掌握。</p>
            <div className="hero-actions">
              <a className="hero-cta" href="#portfolio-form">開始整理持倉 <span aria-hidden="true">↓</span></a>
              <span className="hero-private"><span aria-hidden="true">●</span> 不需註冊 · 不上傳持倉</span>
            </div>
            <div className="hero-pills"><span>目標配置</span><span>再平衡差距</span><span>JSON 備份</span></div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-glow" />
            <div className="hero-ring ring-one" /><div className="hero-ring ring-two" />
            <div className="hero-orb"><span>資產<br /><strong>配置</strong></span></div>
            <div className="hero-chip chip-top"><i />目標比例 <b>清晰可見</b></div>
            <div className="hero-chip chip-bottom"><i />個人資料 <b>留在本機</b></div>
          </div>
        </section>

        <div className="privacy-strip"><span aria-hidden="true">✳</span><p><strong>你的投資資料只留在這台裝置。</strong> 不建立帳戶、不同步持倉；定期匯出 JSON 備份，換裝置時再由你手動匯入。</p></div>

        <section className="feature-row" aria-label="主要功能">
          <article><span className="feature-number">01</span><h2>目標一眼比較</h2><p>並排查看目前與目標配置，快速掌握尚未配置的比例。</p></article>
          <article><span className="feature-number">02</span><h2>差距直接排序</h2><p>找出配置過多或過少的標的，搭配持倉損益與建議股數。</p></article>
          <article><span className="feature-number">03</span><h2>備份由你掌控</h2><p>匯出完整 JSON 備份，存在自己選擇的位置，再隨時匯入還原。</p></article>
        </section>

        {/* Error and Stale Status Alerts */}
        {(currentSnapshot.errors?.length > 0 || docValidationErrors.length > 0 || evaluation.missing.length > 0 || refreshMessage) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {refreshMessage && (
              <div style={{ backgroundColor: currentSnapshot.errors?.length ? 'var(--warning-bg)' : 'var(--success-bg)', border: currentSnapshot.errors?.length ? '1px solid var(--warning-border)' : '1px solid var(--success-border)', color: currentSnapshot.errors?.length ? 'var(--warning-text)' : 'var(--success-text)', padding: '10px 16px', borderRadius: 6, fontSize: 14 }}>
                {refreshMessage}
              </div>
            )}
            {docValidationErrors.map((err, idx) => (
              <div key={idx} style={{ backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '10px 16px', borderRadius: 6, fontSize: 14 }}>
                <strong>資產配置驗證提示：</strong> {err}
              </div>
            ))}
            {evaluation.missing.map((item, idx) => (
              <div key={`missing-${idx}`} style={{ backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)', color: 'var(--warning-text)', padding: '10px 16px', borderRadius: 6, fontSize: 14 }}>
                <strong>估值資料缺項：</strong> {item.message}
              </div>
            ))}
            {currentSnapshot.errors?.map((err, idx) => (
              <div key={idx} style={{ backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)', color: 'var(--warning-text)', padding: '10px 16px', borderRadius: 6, fontSize: 14 }}>
                <strong>市場報價警告：</strong> {err.symbol ? `[${err.symbol}] ` : ''}{err.message}
              </div>
            ))}
          </div>
        )}

        {/* Summary Metric Cards */}
        <section className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16 }}>
          {/* Total Assets */}
          <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>總資產估值 (TWD)</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: evaluation.complete ? 'var(--text-main)' : 'var(--text-muted)' }}>
              {evaluation.complete && evaluation.totalAssetsTwd !== undefined
                ? `NT$ ${formatCurrency(evaluation.totalAssetsTwd)}`
                : '估值不完整'}
            </div>
            {!evaluation.complete && (
              <div style={{ fontSize: 12, color: 'var(--profit-text)', marginTop: 4 }}>
                ⚠️ 缺少必要報價或匯率，避免失真暫不計算總資產與配置差額
              </div>
            )}
          </div>

          {/* Total Cash */}
          <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>總現金儲備 (折合 TWD)</div>
              {cashSaveNotice && <span style={{ fontSize: 11, color: 'var(--loss-text)', fontWeight: 600 }}>✓ 已保存</span>}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: 'var(--text-main)' }}>
              {evaluation.totalCashTwd !== undefined ? `NT$ ${formatCurrency(evaluation.totalCashTwd)}` : '--'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
              實際 {formatPct(evaluation.totalCashTwd !== undefined && evaluation.totalAssetsTwd && evaluation.totalAssetsTwd > 0 ? evaluation.totalCashTwd / evaluation.totalAssetsTwd * 100 : undefined)} · 目標 {formatPct(evaluation.cashTargetWeightPct)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
              再平衡差額 {evaluation.complete && evaluation.cashDifferenceTwd !== undefined ? `NT$ ${formatSignedCurrency(evaluation.cashDifferenceTwd)}` : '--'}
              {evaluation.cashDifferenceTwd !== undefined && Math.abs(evaluation.cashDifferenceTwd) >= 0.01 && <span> · {evaluation.cashDifferenceTwd > 0 ? '現金高於目標' : '現金低於目標'}</span>}
            </div>
            <form onSubmit={handleSaveCash} style={{ marginTop: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: 8 }}>
                <div>
                  <label htmlFor="cash-allocation-pct" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 3 }}>現金目標 (%)</label>
                  <input id="cash-allocation-pct" type="number" min="0" max="100" step="any" disabled={mode === 'demo'} value={editCashTargetPct}
                    onChange={(e) => setEditCashTargetPct(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 13 }} />
                </div>
                {(['TWD', 'USD', 'JPY'] as const).map((currency) => (
                  <div key={currency}>
                    <label htmlFor={`cash-${currency.toLowerCase()}`} style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 3 }}>實際 {currency}</label>
                    <input id={`cash-${currency.toLowerCase()}`} type="number" min="0" step="any" disabled={mode === 'demo'} value={editCashBalances[currency]}
                      onChange={(e) => setEditCashBalances((previous) => ({ ...previous, [currency]: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 13 }} />
                  </div>
                ))}
              </div>
              {mode === 'real' && <button type="submit" style={{ marginTop: 8, backgroundColor: 'var(--surface-active)', color: 'var(--text-main)', border: 'none', padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>儲存現金配置</button>}
              {cashError && <p role="alert" style={{ color: 'var(--danger-text)', fontSize: 11, margin: '6px 0 0' }}>{cashError}</p>}
            </form>
          </div>

          {/* Total Holdings Cost Basis */}
          <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>持股成本基礎 (TWD)</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: evaluation.totalCostBasisTwd !== undefined ? 'var(--text-main)' : 'var(--text-muted)' }}>
              {evaluation.totalCostBasisTwd !== undefined
                ? `NT$ ${formatCurrency(evaluation.totalCostBasisTwd)}`
                : '--'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>平均成本 × 持有數量，按目前匯率折算；不含現金。缺行情時仍可顯示已知成本。</div>
          </div>

          {/* Total Unrealized P/L */}
          <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>未實現總損益 (TWD · 紅漲綠跌)</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                marginTop: 8,
                color:
                  !evaluation.complete || evaluation.totalUnrealizedPlTwd === undefined
                    ? 'var(--text-muted)'
                    : evaluation.totalUnrealizedPlTwd >= 0
                    ? 'var(--profit-text)'
                    : 'var(--loss-text)'
              }}
            >
              {evaluation.complete && evaluation.totalUnrealizedPlTwd !== undefined
                ? `${evaluation.totalUnrealizedPlTwd >= 0 ? '+' : ''}${formatCurrency(evaluation.totalUnrealizedPlTwd)} 元`
                : '--'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              匯率基準: 1 USD ≈ {currentSnapshot.fx?.rates.USD ?? '--'} TWD, 1 JPY ≈ {currentSnapshot.fx?.rates.JPY ?? '--'} TWD
            </div>
            <div style={{ fontSize: 11, color: currentSnapshot.fx && isDataStale(currentSnapshot.fx.asOf) ? 'var(--warning-text)' : 'var(--text-muted)', marginTop: 3 }}>
              {currentSnapshot.fx
                ? `來源 ${currentSnapshot.fx.source} · ${new Date(currentSnapshot.fx.asOf).toLocaleDateString('zh-TW')}${isDataStale(currentSnapshot.fx.asOf) ? ' · 匯率資料已過期' : ''}`
                : '尚無可用匯率快照'}
            </div>
          </div>
        </section>

        <AllocationPreview evaluation={evaluation} marketMinimumShares={marketMinimumShares} onMarketMinimumSharesChange={(next) => {
          setMarketMinimumShares(next);
          try { localStorage.setItem(MARKET_MINIMUM_SHARES_KEY, JSON.stringify(next)); } catch { /* Keep the setting for this session. */ }
        }} />
        <HistoryTrends
          snapshots={currentHistory}
          source={mode === 'demo' ? 'demo' : 'local'}
          error={historyError}
          onRetry={historyError ? () => void retryHistory() : undefined}
        />

        {/* Responsive holding cards */}
        <section style={{ backgroundColor: 'var(--card-bg)', borderRadius: 12, padding: 20, border: '1px solid var(--border-color)', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>持股明細與再平衡試算</h2>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>共 {evaluation.holdings.length} 檔投資標的 + 現金</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 12, minWidth: 0 }}>
            {evaluation.holdings.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <svg className="empty-compass" viewBox="0 0 140 140" aria-hidden="true">
                  <circle cx="70" cy="70" r="58" fill="none" stroke="currentColor" strokeDasharray="2 8" opacity=".3" />
                  <ellipse cx="70" cy="70" rx="57" ry="24" fill="none" stroke="currentColor" opacity=".4" transform="rotate(-28 70 70)" />
                  <circle cx="70" cy="70" r="38" fill="#10243a" stroke="currentColor" />
                  <path d="M88 48 78 78 48 92 60 62Z" fill="currentColor" /><path d="M88 48 70 70 48 92 60 62Z" fill="#c6d4e2" />
                  <circle cx="70" cy="70" r="4" fill="#0b1728" /><circle cx="119" cy="42" r="3" fill="currentColor" />
                </svg>
                <p className="eyebrow">YOUR NEXT DIRECTION</p>
                <h3>從第一筆持倉，建立你的方向。</h3>
                <p>輸入數量、成本與目標比例，讓分散的資產回到同一張配置圖。</p>
                <div className="empty-actions">
                  <a className="hero-cta" href="#portfolio-form" onClick={startAddHolding}>新增第一筆持倉 <span aria-hidden="true">↓</span></a>
                  <button type="button" className="secondary-button" onClick={() => setMode('demo')}>先看示範配置</button>
                </div>
                <small>台股・美股・日股 · 以新台幣整合檢視</small>
              </div>
            )}
            {evaluation.holdings.map((item, index) => {
              const { instrument, quote, currentValueTwd, targetAmountTwd, differenceTwd, differenceNative, currentWeightPct, unrealizedPlTwd, unrealizedPlNative, currency } = item;
              const isStale = isDataStale(quote?.asOf);
              const hasQuote = !!quote;
              const priceGapPct = targetPriceGapPct(quote?.price, instrument.longTermTargetPrice);
              const costGapPct = targetPriceGapFromCostPct(instrument.averageCost, instrument.longTermTargetPrice);
              const minimumShares = marketMinimumShares[instrument.market];
              const shareTrade = recommendWholeShareTrade(differenceNative, quote?.price, minimumShares);
              const shareAdvice = shareTrade === null
                ? '報價或差額不足，無法計算股數'
                : shareTrade.side === 'none'
                  ? '無需調整股數'
                  : shareTrade.shares === 0
                    ? `建議${shareTrade.side === 'sell' ? '賣出' : '買進'}：差額不足 ${minimumShares} 股最低操作量`
                    : `建議${shareTrade.side === 'sell' ? '賣出' : '買進'} ${shareTrade.shares} 股`;
              const progressStyle: React.CSSProperties = { height: 20, backgroundColor: 'transparent', borderRadius: 5, position: 'relative', overflow: 'visible', marginTop: 5 };
              const metricStyle: React.CSSProperties = { minWidth: 0, overflowWrap: 'anywhere' };
              const labelStyle: React.CSSProperties = { color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 };

              return (
                <article key={`${instrument.market}-${instrument.symbol}`} style={{ border: '1px solid var(--border-color)', borderRadius: 10, padding: 14, minWidth: 0, background: 'var(--card-bg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <span style={{ background: 'var(--border-color)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{instrument.market}</span>
                        <strong style={{ overflowWrap: 'anywhere' }}>{instrument.symbol}</strong>
                        <span style={{ color: 'var(--text-main)', overflowWrap: 'anywhere' }}>{instrument.name}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>現有 {formatPct(currentWeightPct)} · 目標 {formatPct(instrument.targetWeightPct)}</div>
                    </div>
                    <div style={{ display: 'flex', flexShrink: 0, gap: 6 }}>
                      <button type="button" onClick={() => startEditHolding(index)} style={{ border: '1px solid var(--border-strong)', background: 'var(--card-bg)', padding: '5px 9px', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>編輯</button>
                      <button type="button" onClick={() => handleDeleteHolding(index)} style={{ border: '1px solid var(--danger-border)', background: 'var(--danger-bg)', color: 'var(--profit-text)', padding: '5px 9px', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>刪除</button>
                    </div>
                  </div>
                  <div style={{ ...progressStyle, overflow: 'visible' }} aria-label={`目前佔比 ${formatPct(currentWeightPct)}，目標 ${formatPct(instrument.targetWeightPct)}`}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: 'var(--border-color)', borderRadius: 5 }} />
                    <div style={{ position: 'absolute', top: 0, left: 0, height: 8, width: `${scaleAllocationPercent(currentWeightPct)}%`, borderRadius: 5, background: 'var(--action-buy-text)' }} />
                    <div style={{ position: 'absolute', top: 0, left: `${scaleAllocationPercent(instrument.targetWeightPct)}%`, width: 2, height: 8, background: 'var(--action-sell-text)' }} />
                    <div aria-hidden="true" style={{ position: 'absolute', top: 8, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 9, lineHeight: '12px' }}><span>0%</span><span style={{ position: 'absolute', left: '70%', transform: 'translateX(-50%)' }}>15%</span><span>100%</span></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px 14px', marginTop: 12, fontSize: 13 }}>
                    <div style={metricStyle}><div style={labelStyle}>持有數量 / 平均成本</div>{formatCurrency(instrument.quantity)} 股 · {formatCurrency(instrument.averageCost, 2)} {NATIVE_CURRENCIES[instrument.market]}</div>
                    <div style={metricStyle}><div style={labelStyle}>當前市價 / 現值</div>{hasQuote ? `${formatCurrency(quote.price, 2)} ${quote.currency}` : <span style={{ color: 'var(--profit-text)' }}>缺少報價</span>}<br />NT$ {currentValueTwd !== undefined ? formatCurrency(currentValueTwd) : '--'}</div>
                    <div style={metricStyle}><div style={labelStyle}>長期目標價 / 距現價 / 距成本</div>{instrument.longTermTargetPrice === undefined ? '--' : <>{formatCurrency(instrument.longTermTargetPrice, 2)} {currency}<br /><span style={{ color: priceGapPct === null ? 'var(--text-muted)' : '#2563eb', fontSize: 11 }}>距現價 {priceGapPct === null ? '--' : `${priceGapPct >= 0 ? '+' : ''}${formatPct(priceGapPct)}`}</span><br /><span style={{ color: costGapPct === null ? 'var(--text-muted)' : '#2563eb', fontSize: 11 }}>距成本 {costGapPct === null ? '--' : `${costGapPct >= 0 ? '+' : ''}${formatPct(costGapPct)}`}</span></>}</div>
                    <div style={metricStyle}><div style={labelStyle}>目標金額 (TWD)</div>{targetAmountTwd !== undefined ? `NT$ ${formatCurrency(targetAmountTwd)}` : '--'}</div>
                    <div style={{ ...metricStyle, color: (differenceTwd || 0) > 0 ? 'var(--action-sell-text)' : (differenceTwd || 0) < 0 ? 'var(--action-buy-text)' : 'var(--text-muted)' }}>
                      <div style={labelStyle}>配置差額 · 正數超配／負數低配</div>
                      {differenceTwd !== undefined && differenceNative !== undefined ? <>{currency === 'TWD' ? `TWD ${formatSignedCurrency(differenceTwd)}` : <>NT$ {formatSignedCurrency(differenceTwd)}<br /><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({currency} {formatSignedCurrency(differenceNative)})</span></>}<div aria-label={shareAdvice} style={{ color: shareTrade?.side === 'sell' ? 'var(--action-sell-text)' : shareTrade?.side === 'buy' ? 'var(--action-buy-text)' : 'var(--text-muted)', fontSize: 11, marginTop: 3 }}>{shareAdvice}</div></> : '--'}
                    </div>
                    <div style={{ ...metricStyle, color: (unrealizedPlTwd || 0) >= 0 ? 'var(--profit-text)' : 'var(--loss-text)' }}>
                      <div style={labelStyle}>未實現損益</div>
                      {unrealizedPlTwd !== undefined && unrealizedPlNative !== undefined ? currency === 'TWD' ? `TWD ${formatSignedCurrency(unrealizedPlTwd)}` : <>NT$ {formatSignedCurrency(unrealizedPlTwd)}<br /><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({currency} {formatSignedCurrency(unrealizedPlNative)})</span></> : '--'}
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--surface-subtle)', marginTop: 12, paddingTop: 10, fontSize: 11, color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>
                    <div>{hasQuote ? <>{quote.source || '快取報價'} · {new Date(quote.asOf).toLocaleDateString('zh-TW')}{isStale && <strong style={{ color: 'var(--profit-text)', marginLeft: 4 }}>(過期 &gt;3天)</strong>}</> : <strong style={{ color: 'var(--profit-text)' }}>待更新報價</strong>}</div>
                    {mode === 'real' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap: 6, marginTop: 8 }}>
                      <input aria-label={`手動市價 ${instrument.symbol}`} type="number" step="any" min="0.000001" placeholder={`手動市價 (${NATIVE_CURRENCIES[instrument.market]})`}
                        value={manualPriceDrafts[`${instrument.market}:${instrument.symbol.toUpperCase()}`]?.price ?? instrument.manualPriceOverride?.price ?? ''}
                        onChange={e => { const key = `${instrument.market}:${instrument.symbol.toUpperCase()}`; setManualPriceDrafts(prev => ({ ...prev, [key]: { price: e.target.value, asOf: prev[key]?.asOf ?? instrument.manualPriceOverride?.asOf ?? localDay() } })); }}
                        style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: 6, border: '1px solid var(--border-strong)', borderRadius: 4, fontSize: 11 }} />
                      <input aria-label={`手動市價日期 ${instrument.symbol}`} type="date"
                        value={manualPriceDrafts[`${instrument.market}:${instrument.symbol.toUpperCase()}`]?.asOf ?? instrument.manualPriceOverride?.asOf ?? localDay()}
                        onChange={e => { const key = `${instrument.market}:${instrument.symbol.toUpperCase()}`; setManualPriceDrafts(prev => ({ ...prev, [key]: { price: prev[key]?.price ?? String(instrument.manualPriceOverride?.price ?? ''), asOf: e.target.value } })); }}
                        style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: 6, border: '1px solid var(--border-strong)', borderRadius: 4, fontSize: 11 }} />
                      <button type="button" onClick={() => saveManualPrice(index)} style={{ padding: '6px 8px', fontSize: 11 }}>套用手動價</button>
                      {instrument.manualPriceOverride && <button type="button" onClick={() => clearManualPrice(index)} style={{ padding: '6px 8px', fontSize: 11 }}>恢復自動報價</button>}
                    </div>}
                  </div>
                </article>
              );
            })}
            <article aria-label="現金配置" style={{ border: '1px solid var(--border-strong)', borderRadius: 10, padding: 14, minWidth: 0, background: 'var(--surface-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <strong>現金</strong><strong>NT$ {evaluation.totalCashTwd !== undefined ? formatCurrency(evaluation.totalCashTwd) : '--'}</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                {(['TWD', 'USD', 'JPY'] as const).map((cashCurrency) => <div key={cashCurrency} style={{ minWidth: 0, overflowWrap: 'anywhere' }}><div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{cashCurrency}</div>{formatCurrency(currentDoc.cash[cashCurrency], cashCurrency === 'TWD' ? 0 : 2)}</div>)}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                <div>現有 {formatPct(evaluation.totalCashTwd !== undefined && evaluation.totalAssetsTwd && evaluation.totalAssetsTwd > 0 ? evaluation.totalCashTwd / evaluation.totalAssetsTwd * 100 : undefined)} · 目標 {formatPct(evaluation.cashTargetWeightPct)}</div>
                <div style={{ height: 8, background: 'var(--border-color)', borderRadius: 5, position: 'relative', overflow: 'hidden', marginTop: 5 }}>
                  <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${scaleAllocationPercent(evaluation.totalCashTwd !== undefined && evaluation.totalAssetsTwd && evaluation.totalAssetsTwd > 0 ? evaluation.totalCashTwd / evaluation.totalAssetsTwd * 100 : 0)}%`, background: 'var(--text-muted)' }} />
                  <div style={{ position: 'absolute', top: 0, left: `${scaleAllocationPercent(evaluation.cashTargetWeightPct)}%`, width: 2, height: '100%', background: 'var(--action-sell-text)' }} />
                </div>
                <div style={{ marginTop: 8 }}>目標金額 {evaluation.cashTargetAmountTwd !== undefined ? `NT$ ${formatCurrency(evaluation.cashTargetAmountTwd)}` : '--'} · 差額 {evaluation.cashDifferenceTwd !== undefined ? `TWD ${formatSignedCurrency(evaluation.cashDifferenceTwd)}` : '--'}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 3 }}>{evaluation.cashDifferenceTwd === undefined ? '匯率或估值資料不足' : Math.abs(evaluation.cashDifferenceTwd) < 0.01 ? '已達目標' : evaluation.cashDifferenceTwd > 0 ? '可減少現金' : '需增加現金'} · 匯率折算</div>
              </div>
            </article>
          </div>
        </section>

        {/* Add / Edit Holding Form */}
        <section id="portfolio-form" style={{ backgroundColor: 'var(--card-bg)', borderRadius: 12, padding: 20, border: '1px solid var(--border-color)', scrollMarginTop: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              {editingIndex !== null ? `編輯持股標的 (${formSymbol})` : '新增投資標的'}
            </h2>
            <div aria-label={`未配置 ${targetAllocationSummary.unallocatedPct.toFixed(1)}%，整體目標分布`} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 340px', maxWidth: 600, minWidth: 230, padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--surface-subtle)' }}>
              <div style={{ flexShrink: 0, minWidth: 82 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>未配置</div>
                <strong style={{ fontSize: 19, lineHeight: 1.2, color: targetAllocationSummary.unallocatedPct > 0 ? 'var(--warning-text)' : 'var(--success-text)', fontVariantNumeric: 'tabular-nums' }}>
                  {targetAllocationSummary.unallocatedPct.toFixed(1)}%
                </strong>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>整體目標分布</div>
                <div role="img" aria-label={targetAllocationSummary.parts.map((part) => `${part.label} ${part.pct.toFixed(1)}%`).join('、')} style={{ display: 'flex', height: 9, width: '100%', overflow: 'hidden', borderRadius: 6, background: 'var(--border-color)' }}>
                  {targetAllocationSummary.parts.map((part) => <span key={part.id} title={`${part.label} ${part.pct.toFixed(1)}%`} style={{ width: `${part.pct}%`, backgroundColor: part.color }} />)}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 8px', marginTop: 5, fontSize: 10, lineHeight: 1.3, color: 'var(--text-secondary)' }}>
                  {targetAllocationSummary.parts.map((part) => <span key={part.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                    <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 2, backgroundColor: part.color }} />
                    {part.label} {part.pct.toFixed(1)}%
                  </span>)}
                </div>
              </div>
            </div>
          </div>

          {formError && (
            <div style={{ backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '10px 14px', borderRadius: 6, fontSize: 14, marginBottom: 16 }}>
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveHolding} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 16 }}>
            <div>
              <label htmlFor="holding-market" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                交易市場
              </label>
              <select
                id="holding-market"
                value={formMarket}
                onChange={(e) => setFormMarket(e.target.value as Market)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 14, backgroundColor: 'var(--card-bg)' }}
              >
                <option value="TW">台灣上市 (TW / TWD)</option>
                <option value="TWO">台灣上櫃 (TWO / TWD)</option>
                <option value="US">美國美股 (US / USD)</option>
                <option value="JP">日本日股 (JP / JPY)</option>
              </select>
            </div>

            <div>
              <label htmlFor="holding-symbol" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                標的代號 (Symbol)
              </label>
              <input
                id="holding-symbol"
                type="text"
                placeholder="例如 2330, AAPL"
                value={formSymbol}
                onChange={(e) => setFormSymbol(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 14 }}
              />
            </div>

            <div>
              <label htmlFor="holding-name" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                資產名稱
              </label>
              <input
                id="holding-name"
                type="text"
                placeholder="例如 台積電, 蘋果公司"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 14 }}
              />
            </div>

            <div>
              <label htmlFor="holding-cost" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                平均成本 ({NATIVE_CURRENCIES[formMarket]})
              </label>
              <input
                id="holding-cost"
                type="number"
                step="any"
                placeholder="買入均價"
                value={formAvgCost}
                onChange={(e) => setFormAvgCost(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 14 }}
              />
            </div>

            <div>
              <label htmlFor="holding-quantity" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                持有股數/數量
              </label>
              <input
                id="holding-quantity"
                type="number"
                step="any"
                placeholder="持有數量"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 14 }}
              />
            </div>

            <div>
              <label htmlFor="holding-target-weight" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                目標配置比率 (%)
              </label>
              <input
                id="holding-target-weight"
                type="number"
                step="any"
                placeholder="0 ~ 100"
                value={formTargetWeight}
                onChange={(e) => setFormTargetWeight(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 14 }}
              />
            </div>

            <div>
              <label htmlFor="holding-long-term-target-price" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                長期目標價 ({NATIVE_CURRENCIES[formMarket]})
              </label>
              <input
                id="holding-long-term-target-price"
                type="number"
                min="0.000001"
                step="any"
                placeholder="選填"
                value={formLongTermTargetPrice}
                onChange={(e) => setFormLongTermTargetPrice(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 14 }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              {editingIndex !== null && (
                <button
                  type="button"
                  onClick={startAddHolding}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid var(--border-strong)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  取消編輯
                </button>
              )}
              <button
                type="submit"
                style={{
                  padding: '8px 24px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                {editingIndex !== null ? '更新標的' : '確認新增'}
              </button>
            </div>
          </form>
        </section>
      </main>
      <footer className="site-footer">
        <p><strong>持倉羅盤</strong> · 資料留在本機，備份由你掌握。</p>
        <p>本工具僅提供投資組合整理與情境試算，不構成投資建議或買賣指示。請自行核對報價、匯率與交易單位。</p>
        <a href="./privacy.html">隱私與資料說明</a>
      </footer>
    </div>
  );
}

