# 持倉羅盤 (Portfolio Compass) 商業戰略與產品成長白皮書
*商業總監 (Chief Commercial Officer / Head of Growth) 戰略分析報告*

---

> **專案核心標語 (Slogan)**：看懂配置，讓每一步更有方向。  
> **產品定位 (Product Positioning)**：本機優先 (Local-First)、零信任 (Zero-Trust)、高隱私的跨市場資產配置與再平衡導航儀。  
> **目標讀者 (Target Audience)**：產品團隊、UI/UX 美術設計師、廣告投放投手、內容成長團隊、以及協同工作的各領域 AI Agents。

---

## 目錄 (Table of Contents)
1. [執行摘要與商業價值主張 (Executive Summary & Core Value Prop)](#1-執行摘要與商業價值主張)
2. [深度用戶畫像與需求場景拆解 (User Personas & JTBD Deep Dive)](#2-深度用戶畫像與需求場景拆解)
3. [產品殺手級功能與 FAB 價值矩陣 (Killer Features & FAB Analysis)](#3-產品殺手級功能與-fab-價值矩陣)
4. [美術與視覺設計強化指導方針 (Art, Visual & UX Design Directive)](#4-美術與視覺設計強化指導方針)
5. [高轉化廣告投放與增長實戰手冊 (High-Converting Advertising Playbook)](#5-高轉化廣告投放與增長實戰手冊)
6. [多 Agent 協同規範與上下文注入範本 (Inter-Agent Collaboration Reference)](#6-多-agent-協同規範與上下文注入範本)

---

## 1. 執行摘要與商業價值主張

### 1.1 市場痛點與商業切入契機
當代個人理財與資產管理 (Personal Wealth Management) 市場面臨深刻的結構性矛盾：
1. **隱私掠奪與資安恐慌**：商業記帳與看盤軟體普遍要求綁定手機、Email、甚至強制透過 Open Banking 授權銀行與券商帳密。用戶的全部淨資產與持倉明細被迫儲存在中心化伺服器，面臨資料外洩、精準釣魚電話與被廣告標籤化的巨大恐慌。
2. **功能臃腫與訂閱陷阱**：多數金融 App 夾帶大量借貸推銷、加密貨幣廣告、理財商品導購，並以月費訂閱制（每月 $150~$499 元）收取高額門檻。對於只想專注「做好資產配置」的紀律投資人而言，充斥著嚴重的信噪比失衡。
3. **試算表 (Excel / Google Sheets) 維護地獄**：進階投資人常退回自建試算表，但面臨公式經常失效（`#REF!`、`#VALUE!`）、跨國匯率手動填寫繁複、手機端閱讀操作極為不便，以及手動換算「該下幾股」極易出錯的困境。

### 1.2 持倉羅盤 (Portfolio Compass) 的定位與護城河
**持倉羅盤**不走傳統中心化金融科技的老路，而是開創極致的 **「本機優先 (Local-First) 理財產品體驗」**：
- **零摩擦進入 (Zero Friction)**：純靜態 Web App，免安裝、免註冊、開箱即用，提供「3 秒 Demo 模式」，點擊即可立即理解全球配置邏輯。
- **絕對隱私自託管 (True Sovereign Privacy)**：所有持倉、股數、成本、外幣現金與每日歷史走勢，100% 儲存在使用者瀏覽器的 `localStorage`，不設後端伺服器資料庫，永不上傳任何財務數據。
- **具體可執行的決策指引**：不只呈現佔比，更透過獨創算法直接計算「建議買進／賣出整數股數 (`recommendWholeShareTrade`)」，將模糊的差額數字轉化為零心理負擔的下單指令。
- **跨市場四類標的＋三大外幣現金**：原生整合台灣上市 (TW)、台灣上櫃 (TWO)、美股 (US)、日股 (JP)，搭配新台幣 (TWD)、美元 (USD)、日圓 (JPY) 現金儲備，統一折合新台幣計算總身家。

### 1.3 競品對比矩陣 (Competitive Teardown)

| 評估維度 | 持倉羅盤 (Portfolio Compass) | Google Sheets / Excel | 券商官方 App (如國泰/富邦/元大) | 雲端資產管理 SaaS (如麻布/Kubera/Sharesight) |
| :--- | :--- | :--- | :--- | :--- |
| **財務隱私安全** | 🟢 **100% 本機儲存，零上傳** | 🟡 儲存於微軟或 Google 雲端 | 🔴 券商中心化掌握個人資料 | 🔴 必須上傳全部資產與帳密憑證 |
| **跨券商跨市場整合** | 🟢 **台股/美股/日股/外幣一頁整合** | 🟡 需大量手動撰寫爬蟲公式 | 🔴 僅限該券商內部開立之部位 | 🟡 支援廣但台灣在地券商支援差 |
| **再平衡整股換算** | 🟢 **自動計算建議買賣股數** | 🔴 需自行維護複雜除法公式 | 🔴 無此功能（僅有單檔損益） | 🟡 僅顯示金額差額，無精準股數換算 |
| **使用成本門檻** | 🟢 **完全免費、開源無廣告** | 🟢 免費（但維護時間成本高） | 🟢 免費（但綁定開戶交易） | 🔴 高昂月費或年費訂閱制 |
| **行動端介面體驗** | 🟢 **響應式卡片，觸控友善** | 🔴 手機看表格字體極小易按錯 | 🟡 介面複雜，看盤資訊過多干擾 | 🟡 專注帳戶同步，缺乏再平衡導航 |
| **資料可攜性** | 🟢 **一鍵標準 JSON 匯出/匯入** | 🟡 格式各異，不易跨系統流轉 | 🔴 無法完整匯出自訂配置設定 | 🟡 僅提供有限 CSV 匯出 |

---

## 2. 深度用戶畫像與需求場景拆解

深入拆解用戶的真實心理與情境，是為美術設計師確立視覺張力、為行銷人員提煉吸睛文案的基石。本專案鎖定 6 大核心 Persona：

### Persona 1: 指數化被動投資族 / ETF 存股族 (The Systematic Indexer & Boglehead)
- **代表畫像**：32 歲科技業後端工程師，每月定期定額 0050、006208 與美股 VT / BNDW。
- **核心哲學**：買進全市場、指數化投資、長期持有、半年或每年嚴格執行再平衡。
- **關鍵痛點 (Pain Points)**：
  - 到了定期再平衡日期，打開自建試算表，發現公式因 Google Finance 函數改版失效。
  - 算出了「股票部位需減碼 5 萬元、債券需加碼 5 萬元」，但還得自己按計算機拿 5 萬除以當前市價，換算究竟該下單買幾股。
  - 面臨跌深標的產生心理抗拒不敢加碼，漲多標的捨不得停利，缺乏去情緒化的機械式指引。
- **本專案解法 (Solution)**：
  - 目標權重 vs 現況權重雙環 Conic Gradient 圓餅圖一秒對照。
  - 直接提示「建議買進 12 股」或「建議賣出 5 股」，消除計算負擔與心理阻力。

### Persona 2: 跨國多幣別多券商全球配置者 (The Global Multi-Currency Allocator)
- **代表畫像**：40 歲外商主管，資產分散於台股券商、海外 Firstrade / 盈透證券 (IBKR) 與銀行高利美金定存、日圓現鈔。
- **核心哲學**：全球分散、股債匯動態平衡、不把雞蛋放在同一個國家與幣別。
- **關鍵痛點 (Pain Points)**：
  - 台股 App 看不到美股，美股券商看不到銀行裡的美金活存與台幣緊急備用金。
  - 匯率天天波動，每次要向另一半報告「我們家現在總淨資產到底是多少」時，得手動換算三種幣別，耗時半小時以上。
  - 現金拖累 (Cash Drag) 嚴重：不知不覺留了過多閒置現金錯失複利，或遭遇大回檔時發現手頭沒預留現金可加碼。
- **本專案解法 (Solution)**：
  - 一頁整合 TW（上市）、TWO（上櫃）、US（美股）、JP（日股）。
  - 獨立設計 TWD / USD / JPY 現金儲備與目標現金比例計算，精確指示「可減少現金投入股市」或「需增加現金備援」。

### Persona 3: 極度重視隱私與資安的自託管者 (The Privacy-First Sovereign Individual)
- **代表畫像**：35 歲資深資安顧問、開源社群技術狂熱者、高資產淨值人士 (HNWI)。
- **核心哲學**：“Don't trust, verify.” 堅信個人財務隱私是神聖不可侵犯的底線。
- **關鍵痛點 (Pain Points)**：
  - 絕對不願在第三方雲端理財平台輸入手機號碼或授權銀行 API。
  - 擔憂理財 SaaS 平台倒閉、被駭客竊取資料庫、或財務資料被轉賣給保險貸款電銷。
  - 厭惡 App 內各種推播通知、貸款廣告與社群推薦。
- **本專案解法 (Solution)**：
  - **Local-First 本機優先架構**：所有資料只存瀏覽器 `localStorage`，程式在用戶端運行，無伺服器側錄。
  - **零追蹤代碼**：零廣告 SDK、零第三方 Cookie、零侵入式 Pixel。
  - **自主掌控備份**：提供標準 JSON 匯出與匯入功能，檔案可存於私有離線硬碟或自建 NAS。

### Persona 4: 長期價值投資者與標的追蹤者 (The Long-Term Fundamental Investor)
- **代表畫像**：45 歲傳統產業中階主管，專注基本面研究，持有台積電、聯發科、蘋果、波克夏等好公司。
- **核心哲學**：在合理價以下買進，設定長期目標價，不被短線技術指標洗出場。
- **關鍵痛點 (Pain Points)**：
  - 一般券商 App 只有今日漲跌幅與分時 K 線，缺乏「距離我的長期目標價還有多少空間」的宏觀視角。
  - 當股價大幅飆升超出內在價值時，缺乏冷靜的配置比例提示以適度分批獲利了結。
- **本專案解法 (Solution)**：
  - 獨創「長期目標價（`longTermTargetPrice`）」欄位，自動連動計算「距現價 Gap %」與「距成本 Gap %」。
  - 結合未實現損益與目標配置比例，幫助價值投資人在股價高於目標價時從容執行再平衡。

### Persona 5: 剛起步的資產配置新手／理財小白 (The Beginner Allocator)
- **代表畫像**：24 歲剛出社會兩年的職場新人，聽過「股債 80/20 配置」，想開始認真理財。
- **核心哲學**：希望建立健康的財務配置習慣，但對複雜術語與工具感到恐懼。
- **關鍵痛點 (Pain Points)**：
  - 專業交易終端如同飛機駕駛艙，滿滿的技術指標讓人不知從何下手。
  - 搞不清楚目標比例加起來到底有沒有 100%，常常漏算未分配的現金。
- **本專案解法 (Solution)**：
  - 一鍵切換「Demo 示範模式」，免輸入即可觀摩成熟投資組合的運作架構。
  - 即時「未配置比例 (Unallocated %)」視覺進度條，未配滿時警示提示，配滿 100% 變為健康綠色，反饋感極強。

### Persona 6: FIRE (Financial Independence, Retire Early) 提早退休族群 / 退休資產提取者
- **代表畫像**：38 歲已達成半退休 (Coast FIRE) 的自由職業者，依靠 4% 法則與資產配置維持生活開銷。
- **核心哲學**：嚴格控管資產提領率，利用每年再平衡獲利了結的部分作為生活費，防禦報酬順序風險 (Sequence of Returns Risk)。
- **關鍵痛點 (Pain Points)**：
  - 每年要提取 60 萬台幣生活費時，不知道該賣台股、賣美股、還是動用美元定存。
  - 缺乏全域淨資產的歷史走勢追蹤，無法評估整體組合在提取後的長期複利抗震能力。
- **本專案解法 (Solution)**：
  - 再平衡試算直接給出「哪些標的超配需賣出」，提取生活費的同時自動完成組合去風險化。
  - 每日資產歷史快照 (`DailySnapshot`) 與純 SVG 100% 堆疊走勢圖，清晰可見資產結構變化。

---

## 3. 產品殺手級功能與 FAB 價值矩陣

| 功能特性 (Feature) | 核心技術與算法優勢 (Advantage) | 用戶具體獲益 (Benefit) |
| :--- | :--- | :--- |
| **Local-First 本機存儲架構** | 數據完全留在當前瀏覽器 `localStorage`，無需伺服器交互，無遠端資料庫 | 財務個資零外洩風險，離線亦可秒開查看，不受伺服器斷線影響 |
| **目標 vs 目前雙環圓餅圖** | 以 Conic Gradient 即時渲染雙重視覺，直觀呈現各資產權重分布 | 一秒看懂哪裡超配、哪裡不足，徹底擺脫枯燥複雜的純文字表格 |
| **智慧整股下單建議** | `recommendWholeShareTrade` 算法自動考量原生幣別與現價，換算整數股 | 告別繁瑣手動除法運算，直接拿著 App 建議的股數開啟券商下單 |
| **動態未配置比例指示條** | 自動計算 `100% - 目標持股% - 目標現金%` 並以視覺長條圖呈現 | 防止資金配置短缺或過度配置，精確掌握每一分可用預算 |
| **四市場＋三外幣整合** | 支援 TW/TWO/US/JP 市場與 TWD/USD/JPY 現金，自動折算新台幣 | 無論資產分散在台灣券商或海外帳戶，都能一頁掌握真實淨資產 |
| **長期目標價追蹤** | 支援設定長期價值錨點，自動試算與現價及成本之偏離幅度 | 給予長期投資人定力，抵抗短期牛熊情緒震盪 |
| **歷史資產趨勢追蹤** | 自動累積每日總資產快照與 100% 堆疊比例圖，純 SVG 高效渲染 | 無需連網後端即可回顧資產增長歷史，見證複利累積軌跡 |
| **免註冊 Demo 示範模式** | 一鍵切換預設的高品質多市場範例數據 | 零門檻體驗產品價值，快速引導新用戶理解資產配置邏輯 |
| **自主 JSON 備份還原** | 乾淨透明的 JSON 格式匯出，匯入時具備完整驗證與覆寫防呆 | 永遠不被單一軟體綁架，資料自主遷移、長久保存 |

---

## 4. 美術與視覺設計強化指導方針

為了協助美術與 UI 設計師將「持倉羅盤」從優秀的原型提升為頂級質感的金融科技精品，本章節提供具體的設計指導、視覺語言升級建議與資產交付規範：

### 4.1 品牌視覺調性 (Brand Identity & Aesthetics)
- **設計風格定義**：**Neo-Fintech Precision（新金融科技極簡主義）**
  - 融合「瑞士平面排版 (Swiss Typographic Style)」的秩序感與「星際導航 (Stellar Navigation)」的深邃感。
  - 告別廉價活潑的插畫，走向深思熟慮、安靜奢華 (Quiet Luxury) 的專業金融儀態。
- **色彩系統升級與語義解耦規範（關鍵核心）**：
  - **當前系統痛點**：目前的程式碼中，Hero 區塊為深色背景 (`#0b1728`)，但下方主體卻採用淺色 Slate (`#f1f5f9`)，形成視覺斷層；更關鍵的是，台股習慣「紅漲綠跌」，但再平衡模組卻將「建議賣出（超配部位）」用綠色顯示、「建議買進（不足部位）」用紅色顯示，容易引發心理誤判！
  - **語義解耦標準 (Crucial Semantic Disambiguation)**：
    1. **損益語義 (P&L Semantic)**：
       - 提供「台股模式（紅漲綠跌）」或「國際模式（綠漲紅跌）」切換。
    2. **再平衡動作語義 (Rebalancing Action Semantic)**：**嚴格禁止使用純紅/純綠表示再平衡動作！**
       - **建議買進 (Buy / Add)**：使用 **電光藍 (Electric Blue `#2563eb`)** 或 **薄荷青 (`#0d9488`)**。
       - **建議賣出 (Sell / Trim)**：使用 **琥珀金 (Amber Gold `#d97706`)** 或 **紫藤羅 (`#7c3aed`)**。
       - **完美平衡 (Balanced)**：使用 **冷灰 (`#64748b`)** 或 **柔和墨綠 (`#059669`)**。
       - 如此能徹底區隔「損益表現」與「配置再平衡調節動作」。

### 4.2 現代化 CSS Design Tokens 規範
為使前端工程師與美術 Agent 能無縫同步，定義標準 Token 如下：

```css
:root {
  /* Surface & Canvas Tokens */
  --color-canvas-bg: #0b1728;
  --color-canvas-surface: #10243a;
  --color-card-bg: rgba(18, 38, 62, 0.75);
  --color-card-border: rgba(163, 229, 219, 0.18);
  --color-card-hover: rgba(28, 56, 88, 0.85);

  /* Typography Hierarchy */
  --color-text-primary: #f8fafc;
  --color-text-secondary: #c6d4e2;
  --color-text-muted: #8096ac;
  --font-family-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif;
  --font-numeric: "JetBrains Mono", "Fira Code", monospace;

  /* Brand Accents */
  --color-accent-teal: #69d5bd;
  --color-accent-teal-glow: rgba(105, 213, 189, 0.25);
  --color-accent-teal-hover: #9ce7d6;

  /* Rebalancing Action Tokens (Decoupled from P&L) */
  --action-buy-bg: rgba(37, 99, 235, 0.12);
  --action-buy-border: #2563eb;
  --action-buy-text: #60a5fa;

  --action-sell-bg: rgba(217, 119, 6, 0.12);
  --action-sell-border: #d97706;
  --action-sell-text: #fbbf24;

  --action-balanced-bg: rgba(100, 116, 139, 0.12);
  --action-balanced-border: #64748b;
  --action-balanced-text: #94a3b8;
}
```

### 4.3 視覺資產升級與社群卡片規格

#### 1. 羅盤動態 Logo / Favicon 升級
- 將現有扁平同心圓升級為具備 3D 軌道光暈的雙環幾何羅盤。
- 核心指針錨定於 45 度角，微發光粒子點綴於軌道節點。

#### 2. 空狀態 (Empty State) 精緻插畫與快速啟動區
- 用戶首次進入且尚未建立任何持倉時，呈現懸浮發光羅盤與星圖虛線。
- 提供 3 個「一鍵載入經典配置」預設範本快捷按鈕：
  1. `[載入經典 60/40 股債配置]`：VTI 60% + BND 40%
  2. `[載入全天候全市場配置]`：0050 30% + VT 40% + 債券 20% + 現金 10%
  3. `[載入巴菲特 90/10 配置]`：S&P 500 90% + 短期國債/現金 10%

#### 3. 社群 OpenGraph 卡片 (1200x630) 矩陣三版本

```
┌────────────────────────────────────────────────────────┐
│ 版本 1: 品牌大氣星際羅盤版 (Brand Horizon)             │
│ 深邃 #0b1728 底色 + 羅盤發光光環 + Slogan + 核心賣點 Pill│
├────────────────────────────────────────────────────────┤
│ 版本 2: 雙環圓餅與資產儀表板實戰版 (UI Dashboard)       │
│ 微仰角 3D 介面樣機 + Conic 雙環圓餅圖 + 歷史趨勢折線圖 │
├────────────────────────────────────────────────────────┤
│ 版本 3: 告別 Excel 崩潰對比版 (Excel Pain-Buster)      │
│ 左側：灰暗滿是 #REF! 的試算表 vs 右側：清爽明亮的羅盤介面│
└────────────────────────────────────────────────────────┘
```

以下為版本 1 (Brand Horizon) 之高解析度 SVG 原始碼標準範本：
```xml
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1728"/>
      <stop offset="60%" stop-color="#11253e"/>
      <stop offset="100%" stop-color="#183b55"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#69d5bd" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#69d5bd" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="950" cy="315" r="280" fill="url(#glow)"/>
  <circle cx="950" cy="315" r="140" fill="none" stroke="#69d5bd" stroke-width="2" stroke-opacity="0.6"/>
  <ellipse cx="950" cy="315" rx="220" ry="95" fill="none" stroke="#a3e5db" stroke-width="2" stroke-opacity="0.5" transform="rotate(-28 950 315)"/>
  <ellipse cx="950" cy="315" rx="220" ry="95" fill="none" stroke="#93c5fd" stroke-width="2" stroke-opacity="0.35" transform="rotate(42 950 315)"/>
  
  <text x="100" y="160" fill="#69d5bd" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="20" font-weight="800" letter-spacing="6">PORTFOLIO COMPASS</text>
  <text x="100" y="270" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="64" font-weight="800">看懂配置，</text>
  <text x="100" y="360" fill="#a3e5db" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="64" font-weight="800">讓每一步更有方向。</text>
  <text x="105" y="450" fill="#c6d4e2" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="24">100% 本機儲存 · 目標配置雙環圖 · 智慧整股下單建議 · JSON 備份</text>
  
  <rect x="105" y="490" width="130" height="38" rx="19" fill="rgba(105, 213, 189, 0.15)" stroke="#69d5bd" stroke-width="1"/>
  <text x="170" y="515" fill="#69d5bd" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700" text-anchor="middle">免註冊即開即用</text>
  <rect x="250" y="490" width="130" height="38" rx="19" fill="rgba(96, 165, 250, 0.15)" stroke="#60a5fa" stroke-width="1"/>
  <text x="315" y="515" fill="#93c5fd" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700" text-anchor="middle">台美日跨市場</text>
</svg>
```

---

## 5. 高轉化廣告投放與增長實戰手冊

針對行銷團隊、廣告投手與增長負責人，本章節提供直接可執行的受眾策略、成套文案庫、Google RSA 嚴格字數包、短影音分鏡、AI 生圖 Prompt 與無痕隱私追蹤架構。

### 5.1 渠道受眾定向矩陣 (Targeting Matrix)

| 廣告渠道 | 目標受眾畫像 | 興趣標籤與定向條件 | 核心推薦形式 |
| :--- | :--- | :--- | :--- |
| **Meta (FB / IG)** | 25~48 歲有理財習慣的白領、科技工程師、雙薪家庭 | 興趣：指數投資、ETF、財富自由、理財、美股、巴菲特、綠角財經、股癌 | 單圖輪播 (Carousel)、30秒痛點短影音、痛點比較圖 |
| **Threads / X** | 科技人、年輕理財族、開源支持者、獨立開發者 | 標籤：#資產配置 #ETF #理財 #開源工具 #FIRE | 純文字乾貨貼文、對比截圖、開箱實測 Thread |
| **Google Search** | 具備高搜尋意圖的主動搜尋者 | 關鍵字：`ETF再平衡工具`、`資產配置試算`、`美股台股合併記帳`、`Excel再平衡範本` | 搜尋文字廣告 (RSA) + 附加功能連結 (Sitelinks) |
| **理財社群論壇** | PTT Stock板、Dcard理財板、Mobile01、FB ETF社團 | 內容行銷：開源免費工具分享、無業配、無盈利之利他分享文 | 誠懇開發者長文、解決社群痛點之操作教學 |

---

### 5.2 五大高轉化廣告切入角度與文案庫

#### 角度 1：【隱私資安痛點】—— 你的財務隱私，憑什麼上傳給陌生伺服器？
- **適用版位**：Meta 動態消息、X / Threads 科技理財圈。
- **痛點引爆點**：現代人對資料外洩、個資販賣與資產被側錄充滿戒心。
- **文案規格**：
  - **Hook 標題**：你的資產配置 App，正在偷偷把你的身家上傳到雲端嗎？
  - **主要內文**：
    想要看懂自己的投資組合，代價不該是出賣你的財務隱私！  
    市面上一堆免費記帳工具，要你綁定手機、授權銀行帳戶，最後還塞滿貸款廣告⋯⋯  
    
    【持倉羅盤 Portfolio Compass】堅持「本機優先」哲學：  
    🛡️ **完全免註冊**：不收 Email、不要手機號碼，開啟網頁立刻用。  
    🛡️ **零伺服器上傳**：持股、成本、數量、現金全部安全留在你目前的瀏覽器。  
    🛡️ **自主備份**：一鍵匯出標準 JSON 檔案，資料由你自己百分之百掌握。  
    
    不用犧牲隱私，也能享受頂級的資產配置與再平衡試算。
  - **廣告標題**：100% 留在本機的投資組合羅盤｜完全免費·開源無廣告
  - **CTA**：立即體驗 (免安裝)

#### 角度 2：【Excel 維護地獄痛點】—— 別再用那份公式常常壞掉的試算表了！
- **適用版位**：Google 搜尋廣告、Meta 輪播廣告、Threads 乾貨圖文。
- **痛點引爆點**：手動拉 Excel 算再平衡極其繁瑣，公式一改版就報錯，手機上看痛苦萬分。
- **文案規格**：
  - **Hook 標題**：每年做 ETF 再平衡，打開五年前寫的 Excel，公式又 `#REF!` 了？
  - **主要內文**：
    我們投資是為了省下時間享受生活，不是為了當全職 Excel 維護工！  
    
    告別手忙腳亂的公式調整，【持倉羅盤】為你把再平衡化繁為簡：  
    📊 **目標 vs 現況一秒對照**：自訂目標權重，動態雙圓餅圖直觀告訴你哪裡超標、哪裡不足。  
    🎯 **直接算出建議股數**：不再只給你抽象金額，而是直接告訴你「建議買進 12 股」、「建議賣出 5 股」！  
    💱 **跨市場多幣別支援**：台股、美股、日股與外幣現金自動折算新台幣，匯率不再手動填到崩潰。
  - **廣告標題**：一鍵試算 ETF 再平衡股數｜告別 Excel 崩潰試算表
  - **CTA**：開啟使用

#### 角度 3：【跨市場多幣別整合痛點】—— 台股＋美股＋日幣，你真的知道自己總共賺多少嗎？
- **適用版位**：IG 限時動態、Meta 圖像廣告、理財 KOL 推薦素材。
- **痛點引爆點**：帳戶四散在多家券商與外幣戶頭，無法宏觀掌握整體財富折合台幣的真實狀況。
- **文案規格**：
  - **Hook 標題**：台股賺、美股跌、匯率上上下下⋯⋯你的全家當到底是多少？
  - **主要內文**：
    國內券商看不到海外美股戶頭，海外券商又不管你銀行裡留了多少緊急預備金。  
    資產被切得四分五裂，每季盤點就像打仗？  
    
    試試【持倉羅盤】：  
    🌏 跨市場整合：TW 上市、TWO 上櫃、US 美股、JP 日股全支援。  
    💵 現金儲備分析：獨立控管 TWD/USD/JPY 現金目標比例，避免資金閒置拖累報酬。  
    📈 每日資產走勢：自動記錄每日折合台幣總淨值，漂亮走勢圖見證資產成長。
  - **廣告標題**：台美日股＋外幣現金一頁整合｜你的全球資產儀表板
  - **CTA**：免費使用

#### 角度 4：【投資紀律與去情緒化】—— 大跌不敢買？大漲捨不得賣？
- **適用版位**：股市大幅震盪時的即時新聞回應型廣告、社群評論。
- **痛點引爆點**：散戶面對牛熊市時的情緒干擾，常常追高殺低破壞原有計畫。
- **文案規格**：
  - **Hook 標題**：大跌不敢加碼、大漲怕被套牢？你需要一套幫你「去情緒化」的工具。
  - **主要內文**：
    巴菲特常說：「別人貪婪時我恐懼，別人恐懼時我貪婪。」但真正能做到的人少之又少。  
    原因很簡單：你沒有一個客觀的指標指引方向。  
    
    【持倉羅盤】用客觀數據守護你的投資紀律：  
    ⚖️ 嚴格的比重監控：透過自訂閾值警示，客觀告訴你資產偏離程度。  
    📉 長期目標價位錨定：隨時比對持股現價、平均成本與長期目標價距離，冷靜評估風險報酬比。  
    讓數字指導你的手，讓羅盤穩住你的心。
  - **廣告標題**：看懂配置，讓每一步更有方向｜理性的資產再平衡神器
  - **CTA**：免費試用

#### 角度 5：【零門檻 3 秒上手】—— 點一下，立刻體驗最優雅的資產配置介面
- **適用版位**：廣泛受眾拓客 (Top of Funnel)、Reels 廣告。
- **文案規格**：
  - **Hook 標題**：聽過很多次「資產配置」，但一直不知道從何做起？
  - **主要內文**：
    不需要懂複雜的財務公式，也不需要先花時間輸入任何資料。  
    現在點擊連結，一秒切換「Demo 示範模式」，立刻看懂全球投資高手的配置邏輯！  
    純靜態網頁，毫秒級載入，無廣告、無內購、完全開源。
  - **廣告標題**：免費免註冊！線上最佳資產配置視覺化工具
  - **CTA**：立即試玩 Demo

---

### 5.3 Google 響應式搜尋廣告 (RSA) 嚴格字數包與關鍵字庫

> **平台嚴格字數限制**：Headline <= 30 半形字元 (15 個全形漢字)；Description <= 90 半形字元 (45 個全形漢字)。

#### 15 組精準標題 (Headlines - 均 <= 15 全形字)
1. `持倉羅盤-資產配置再平衡` (12字)
2. `一鍵試算ETF再平衡股數` (11字)
3. `100%本機儲存理財工具` (12字)
4. `免註冊免安裝開箱即用` (10字)
5. `台美日股＋外幣現金整合` (11字)
6. `告別公式出錯的Excel` (11字)
7. `資產配置目標與現況對照` (11字)
8. `零伺服器上傳守護隱私` (10字)
9. `智慧整股下單建議換算` (10字)
10. `長期目標價偏離度追蹤` (10字)
11. `看懂配置每步更有方向` (10字)
12. `開源免費資產配置工具` (10字)
13. `歷史資產趨勢純本機記錄` (11字)
14. `一鍵試玩Demo配置模式` (11字)
15. `標準JSON備份自主掌控` (11字)

#### 4 組精準說明 (Descriptions - 均 <= 45 全形字)
1. `告別混亂試算表！輸入目標比例立即算出建議買賣股數，資料留在本機不上傳，完全免費。` (41字)
2. `專為指數投資與存股族打造！一頁整合台美日股與外幣現金，即時對照目前與目標權重差距。` (41字)
3. `拒絕出賣財務隱私！免登入、無廣告、零後端儲存，提供標準JSON匯出，資料完全由你掌握。` (41字)
4. `聽過資產配置卻不知如何開始？點擊一鍵體驗Demo示範資料，立即掌握專業再平衡導航技巧。` (41字)

#### 關鍵字庫與排除名單 (Keywords & Negative Keywords)
- **完全比對 [Exact Match]**：`[ETF再平衡]`、`[資產配置工具]`、`[ETF試算表]`、`[美股台股記帳]`、`[再平衡股數計算]`
- **詞組比對 "Phrase Match"**：`"資產配置 軟體"`、`"ETF 再平衡 公式"`、`"台股 美股 一起管理"`、`"Local First 記帳"`
- **否定關鍵字 (Negative Keywords)**：`破解`、`破解版`、`序號`、`詐騙`、`借貸`、`信用卡申請`、`當沖技巧`、`期貨教學`

---

### 5.4 30 秒高爆款短影音分鏡腳本 (Short-Form Video Script)

| 秒數 | 畫面鏡頭 (Visual Direction) | 旁白 / 台詞 (Audio Voiceover) | 螢幕動態文字 (On-Screen Text) |
| :---: | :--- | :--- | :--- |
| **0~3s** | 主角對著電腦抓狂，螢幕特寫滿是 `#REF!`、`#VALUE!` 與公式報錯的 Excel 表格。 | 「每次到年底要做 ETF 再平衡，算到頭快破掉？」 | **Excel 又爆炸了？** 🤯 |
| **3~8s** | 主角猛按關閉 Excel，切換瀏覽器打開【持倉羅盤】。深藍色高質感儀表板一秒亮起。 | 「別再折磨自己了！這款免費工具直接拯救你。」 | **持倉羅盤 · 一秒上手** ✨ |
| **8~15s** | 特寫畫面：輸入 0050、美股 AAPL 與日股，圓餅圖即時流暢旋轉，呈現雙環對照。 | 「只要輸入目標比例，目前配置跟差距一眼看懂。」 | **雙重視覺對比 · 超清晰** 📊 |
| **15~22s** | 鏡頭特寫「再平衡試算」模組，直接浮現「建議買進 15 股」的藍色標籤。 | 「最爽的是，它直接告訴你該買幾股、賣幾股，不用自己按計算機除以市價！」 | **直接算好買賣股數！** 🎯 |
| **22~27s** | 鏡頭拉近點擊「匯出備份」，彈出「資料 100% 留在本機，免註冊無雲端」。 | 「而且免註冊、不連雲端，你的財富隱私完全只留在你手機裡！」 | **100% 本機儲存 · 極致隱私** 🛡️ |
| **27~30s** | 結尾主視覺畫面定格，顯示 Slogan 與簡潔 URL。主角對鏡頭比讚微笑。 | 「看懂配置，讓每一步更有方向。點擊下方連結立刻免費體驗！」 | **點擊連結 · 免費免安裝體驗** 🚀 |

---

### 5.5 AI 廣告素材生圖 Prompt 庫 (Midjourney v6 / Flux / DALL-E 3)

供美術或廣告投手 Agent 快速生成高點擊率 (CTR) 視覺素材：

```
[Prompt 1: 現代科技感金融儀表板]
A futuristic and clean personal finance dashboard interface showing a dual-ring allocation pie chart and elegant portfolio curves, glowing teal (#69d5bd) and deep navy blue (#0b1728) background, Swiss typography, minimalist aesthetic, quiet luxury, 3D isometric view, premium glassmorphism, cinematic lighting, 8k resolution, UI/UX masterpiece --ar 16:9 --style raw

[Prompt 2: 告別試算表痛點對比情境]
A split screen concept: On the left, a frustrated investor staring at a messy, red-error-filled spreadsheet in dim lighting. On the right, a calm, organized modern investor in a sunlit home office using a sleek, glowing teal portfolio compass web app on a laptop, relief and confidence, hyper-realistic, award-winning photography --ar 16:9

[Prompt 3: 極致隱私與數據自託管象徵]
A glowing metallic compass floating above an encrypted digital safe, neon teal and soft electric blue light rings orbiting around it, pure dark titanium background, symbolizing extreme privacy, local-first data ownership and financial discipline, 3D octane render, highly detailed, photorealistic --ar 1:1
```

---

### 5.6 投放運營、UTM 規範與 A/B 測試架構

#### 1. UTM 參數命名標準
各渠道連結統一採用以下規範，兼顧來源追蹤與無痕隱私承諾：
- `utm_source`: `meta` / `google` / `threads` / `forum`
- `utm_medium`: `cpc` / `social` / `organic` / `referral`
- `utm_campaign`: `privacy_angle` / `excel_buster` / `multi_currency` / `discipline` / `demo_easy`
- `utm_content`: `img_carousel_v1` / `video_30s_v1` / `rsa_headline_a`

*範例網址*：  
`https://portfolio-compass.domain/?utm_source=meta&utm_medium=cpc&utm_campaign=excel_buster&utm_content=video_30s_v1`

#### 2. A/B 測試矩陣與加碼/停損決策樹
- **測試第一輪（切入角度測試）**：將 5 大文案角度在 Meta 上進行動態素材測試 (DCO)，預算均分，週期 3~5 天。
  - **停止規則 (Kill Criteria)**：若某角度 CTR < 1.2% 或點擊單價 (CPC) 高出均值 50%，立即關閉廣告組。
  - **加碼規則 (Scale Criteria)**：若某角度 CTR > 2.5% 且網頁停留時間 > 45 秒，預算擴增 100%。
- **測試第二輪（視覺素材測試）**：以勝出角度測試「3D 介面樣機」vs「痛點 Excel 對比圖」vs「30 秒短影音」。

#### 3. 常見用戶疑慮應對話術 (Objections & Counter-Arguments)
- *疑慮 1*：「這麼好用的工具竟然完全免費？是不是在偷偷賣我的資料？」  
  **回覆話術**：「我們也是受夠了雲端隱私被販賣的投資人！持倉羅盤採用開源 Local-First 架構，程式碼完全公開透明，你的所有資料只保存在你自己的瀏覽器，連我們自己都看不到。」
- *疑慮 2*：「換電腦或手機壞掉，我的持倉不就全沒了？」  
  **回覆話術**：「別擔心！我們提供『一鍵匯出 JSON 備份』功能，建議完成配置後隨手存檔到自己的 Google Drive 或 NAS，換設備時一秒匯入即可完整還原。」
- *疑慮 3*：「為什麼沒有自動連結券商同步功能？」  
  **回覆話術**：「連結券商帳號意味著必須將券商帳密授權給第三方雲端伺服器，這是極大的資安隱患。持倉羅盤專注於『戰略級的季度/年度資產配置』，手動確認一次數據只需 2 分鐘，換來百分之百的安全無虞！」

---

## 6. 多 Agent 協同規範與上下文注入範本

為確保接續執行具體開發、美術渲染、廣告投放與測試的 AI Agents 能無縫銜接，本章節提供精確的上下文注入提示詞、領域模型字典、任務清單與環境執行紅線。

### 6.1 角色職責邊界與任務分派 (Role & Responsibility)

```
┌─────────────────────────────────────────────────────────────┐
│                    商業總監 (CCO / Growth)                  │
│       確立商業定位、用戶需求洞察、視覺規範與高轉化廣告策略    │
└──────────────────────────────┬──────────────────────────────┘
                               │ 指導與輸入
        ┌──────────────────────┼──────────────────────────────┐
        ▼                      ▼                              ▼
┌───────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  前端工程師   │     │   UI/美術設計    │     │   行銷文案 / 投手    │
│    Agent      │     │      Agent       │     │        Agent         │
├───────────────┤     ├──────────────────┤     ├──────────────────────┤
│· 嚴守本機架構 │     │· 升級視覺層次感  │     │· 提取 5 大文案角度  │
│· 維護計算精確 │     │· 重構色票語義    │     │· 針對各渠道客製腳本  │
│· 確保 JSON 相 │     │· 輸出社群卡片與  │     │· 規劃發布與論壇口碑  │
│  容與測試覆蓋 │     │  空狀態精緻圖素  │     │  種草排程            │
└───────────────┘     └──────────────────┘     └──────────────────────┘
```

---

### 6.2 專屬 Agent 系統提示詞注入範本 (System Prompt Context Injections)

#### 1. 給「UI/美術設計 Agent」的提示詞注入模組：
```markdown
你是專業的 Neo-Fintech UI/美術設計師。在處理「持倉羅盤」的視覺升級時，請遵守：
1. 參閱 COMMERCIAL_STRATEGY.md 第 4 節之規範。
2. 視覺調性為「深空夜航基底色 (#0b1728) + 羅盤導航青綠色 (#69d5bd)」。
3. 嚴格落實「再平衡動作語義與損益語義解耦」：買進建議採用電光藍 (#2563eb)，賣出建議採用琥珀橙 (#d97706)，不得將再平衡建議套用台股漲跌紅綠色。
4. 輸出高品質 SVG 資產：包括 1200x630 OpenGraph 3 款分享卡片與精緻空狀態插畫。
```

#### 2. 給「廣告投手 / 行銷 Agent」的提示詞注入模組：
```markdown
你是頂尖的金融科技增長黑客與廣告投手。在推廣「持倉羅盤」時，請遵守：
1. 參閱 COMMERCIAL_STRATEGY.md 第 5 節之廣告手冊。
2. 嚴守「100% 本機儲存、極致隱私、告別 Excel 崩潰」三大核心價值主張。
3. 投放 Google RSA 廣告時，嚴格遵守標題 <= 30 字元、說明 <= 90 字元之限制。
4. 追蹤網址必須規範化攜帶標準 UTM 參數，絕不得加載侵入式第三方 Cookie 追蹤代碼。
```

#### 3. 給「前端工程師 Agent」的提示詞注入模組：
```markdown
你是嚴謹的前端架構師。在維護與擴展「持倉羅盤」代碼時，請遵守：
1. 嚴格維持 Local-First 架構，不得引入任何需要遠端伺服器存儲的 API。
2. 遵循 COMMERCIAL_STRATEGY.md 第 6.3 節之領域模型，維持計算精確性：
   `differenceTwd = currentValueTwd - targetAmountTwd`
   正數表示現有部位超過目標（超配需賣出），負數表示現有部位不足（低配需買進）。
3. 確保所有改動均通過 `tests/portfolio.test.ts`、`tests/history.test.ts`、`tests/allocation-preview.test.ts` 測試。
```

---

### 6.3 核心領域模型與術語標準字典 (Domain Glossary)

各 Agent 在撰寫代碼、數學公式或行銷文案時，必須嚴格遵守以下術語定義，避免符號與邏輯歧義：

- `PortfolioDocument`：投資組合根結構，包含 `holdings: Instrument[]`、`cash: Record<Currency, number>` 與 `targetCashWeightPct: number`。
- `Instrument`：單一投資標的，欄位包含：
  - `market`: `'TW' | 'TWO' | 'US' | 'JP'`
  - `symbol`: 股票代號（如 `2330`, `AAPL`）
  - `name`: 資產名稱
  - `averageCost`: 買入均價（原生幣別）
  - `quantity`: 持有股數
  - `targetWeightPct`: 目標配置比率（0~100）
  - `longTermTargetPrice`: 長期目標價（選填，原生幣別）
  - `manualPriceOverride`: 手動即時報價覆寫物件（選填）
- `Rebalancing Gap (再平衡差額)`：
  - **精確數學定義**：`differenceTwd = currentValueTwd - targetAmountTwd`（現值減去目標金額）。
  - **正負號意義**：
    - `differenceTwd > 0`：現值高於目標金額，表示**部位超配 (Overallocated)**，建議**賣出調節 (Sell / Trim)**。
    - `differenceTwd < 0`：現值低於目標金額，表示**部位低配 (Underallocated)**，建議**買進補足 (Buy / Add)**。
    - `differenceTwd === 0`：部位處於完美平衡狀態。
- `WholeShareTrade` (`recommendWholeShareTrade`)：考量標的原生幣別市價後換算之整股建議（`{ side: 'buy' | 'sell' | 'none', shares: number }`），不產生零股小數，便於券商下單。
- `Unallocated Pct`：未配置比例，計算公式為 `Math.max(0, 100 - sum(targetWeightPct) - targetCashWeightPct)`。
- `DailySnapshot`：每日資產快照，記錄日期、折合台幣總資產與各標的佔比，供本機繪製長期歷史趨勢。

---

### 6.4 協同待辦任務清單 (Actionable Backlog & Acceptance Criteria)

| 任務 ID | 負責角色 | 任務名稱與描述 | 驗收標準 (Acceptance Criteria) |
| :--- | :--- | :--- | :--- |
| **TASK-ART-01** | 美術 Agent | 輸出 3 款 1200x630 OpenGraph 社群卡片 SVG | 包含 Brand Horizon、UI Dashboard 與 Excel Pain-Buster，代碼合規且視覺層次分明。 |
| **TASK-ART-02** | 美術 Agent | 設計 Empty State 精緻插畫與預設範本按鈕 | 在持股為 0 時呈現發光羅盤視覺，並提供 3 套經典投資組合一鍵載入。 |
| **TASK-FE-01** | 前端 Agent | 升級再平衡建議色票（買藍賣橙） | 解耦再平衡動作與損益紅綠色，確保台股模式下不產生認知衝突。 |
| **TASK-FE-02** | 前端 Agent | 統一整站 Dark Mode / Neo-Fintech 主題 | 解決 Hero 區與下方白底卡片視覺斷層，套用標準 CSS Design Tokens。 |
| **TASK-MKT-01** | 行銷 Agent | 設定 Meta 5 組文案素材與短影音測試 | 依第 5 節完成受眾定向、文案導入與 30 秒分鏡腳本製作。 |
| **TASK-MKT-02** | 行銷 Agent | 建立 Google RSA 搜尋廣告廣告活動 | 匯入 15 組標題與 4 組說明，並設定否定關鍵字名單。 |

---

### 6.5 環境執行與測試防呆紅線 (Operational Invariants)

1. **Windows PowerShell 指令執行紅線**：
   - 在 Windows 環境下，直接執行 `npm test` 或 `npm run build` 會受 PowerShell Script Execution Policy 限制而拋出 `PSSecurityException`。
   - **必須使用以下指令格式執行**：
     ```powershell
     cmd.exe /c npm test
     cmd.exe /c npm run build
     ```
2. **本機架構不可破壞**：嚴禁任何 Agent 在未經授權下引入雲端資料庫、後端同步伺服器或未加密的第三方遙測 SDK。
3. **測試不可減弱 (No Test Tampering)**：任何演進必須確保 `tests/portfolio.test.ts`、`tests/history.test.ts` 與 `tests/allocation-preview.test.ts` 共 25 項測試全部綠燈通過。

---
*本白皮書由商業總監制定並歸檔於專案根目錄，所有協作 Agents 於執行任務前應以此為最高戰略依據。*
