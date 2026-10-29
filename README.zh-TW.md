# GEO DATA EXPLORER

[English](./README.md) · **繁體中文**

> **地理空間資料分析與分級設色工作台** — 純前端、離線運算、支援 GeoJSON 與 CSV 多維度關聯、時序動態推進與統計圖表分析

<p align="center">
  <a href="https://github.com/ReiKama414/geo-data-explorer">Star</a>
  ·
  <a href="https://reikama414.vercel.app/">個人網站</a>
  ·
  <a href="#快速開始">快速開始</a>
  ·
  <a href="#license--權限">授權</a>
</p>

---

## 為什麼做

地理空間數據（如縣市統計、人口指標、環境觀測）常分散於表格與向量邊界檔中，傳統 GIS 軟體龐重且需繁複設定。本專案提供開箱即用的現代 Web 工作台：一鍵匯入 GeoJSON 與 CSV、依代碼自動關聯、多種分級演算法設色、時序滑桿播放，且全功能於瀏覽器端純前端運算，不需要後端資料庫或外部付費 API

## 亮點

- **真實資料關聯** — 支援標準 GeoJSON 與 CSV，自動探測代碼鍵值、數值指標與多期時間維度
- **嚴謹未匹配防護** — 對於無對應多邊形的 CSV 記錄，**絕不捏造或隨意推測經緯度座標**，提供專屬診斷面板、手動別名映射與未匹配 CSV 匯出
- **四種統計分級** — Jenks 自然間斷法、分位數法、等距分級與對數分級，搭配九款專業漸層色盤與階數調整
- **ECharts 分析圖表** — 採嚴格五階文檔流架構（標題、說明、統計數值、圖表繪製、圖例補充），提供水平長條排行、多期時序走勢與分級分佈直方圖
- **時序動態播放** — 支援多期年份平滑切換、自動前進播放、單步微調與播放倍速切換
- **黑白雙主題** — 支援 System、Light、Dark 模式，預設依系統主題即時回應，樣式深度適配地圖底圖與所有分析元件
- **本機 IndexedDB 持久化** — 工作區自動暫存、命名專案儲存、專案清單還原載入與備份 JSON 匯出匯入
- **全端響應式與零重疊** — 支援 320px 手機至 1920px 桌面等九大 Viewport，全域無水平溢出捲軸，浮動元件與圖表分區嚴格零覆蓋碰撞

## 技術棧

| 範圍 | 選用 |
| --- | --- |
| 核心應用 | React 19 · TypeScript · Vite · Tailwind CSS 4 |
| 地圖引擎 | MapLibre GL JS（向量多邊形渲染、動態設色、圖徵互動定位） |
| 圖表分析 | Apache ECharts 6（水平柱狀排行、多期折線趨勢、分級直方圖） |
| 空間統計 | d3-scale · d3-array（Jenks 自然間斷法、Quantile、Equal、Logarithmic） |
| 表格處理 | PapaParse（CSV 解析與 RFC 4180 規格匯出） |
| 本機存儲 | IndexedDB（透過 `idb` 封裝，支援專案命名存檔與備份還原） |
| 圖示字型 | Lucide React · Inter · JetBrains Mono |
| 測試體系 | Vitest 核心計算單元測試 · Playwright 跨裝置 E2E 自動化驗收 |

## 快速開始

建議 Node.js 20+

```bash
npm install
npm run dev
```

開啟 Vite 印出的本機網址

正式建置：

```bash
npm run build
npm run preview
```

靜態產物輸出於 `dist/`，相容 Cloudflare Pages 部署規範

### 測試驗證

```bash
# 執行核心計算單元測試 (Vitest)
npm test

# 執行 TypeScript 型別檢查
npx tsc -b

# 執行 Playwright 真實瀏覽器端到端測試
npm run test:e2e
```

## 操作

| 動作 | 結果 |
| --- | --- |
| 點選地圖多邊形 | 地圖高亮該區域，右側面板顯示完整屬性、排名與百分位數 |
| 切換上方分析指標 | 地圖設色、統計卡片、ECharts 圖表與排行榜同步重新計算 |
| 滑動數值門檻滑桿 | 即時過濾地圖上符合範圍之區域 |
| 輸入名稱或代碼搜尋 | 地圖僅高亮符合文字之區域，非匹配區域轉為半透明 |
| 點擊圖例各區間色塊 | 隔離顯示屬於該數值級距的空間圖徵 |
| 點擊時序播放器 | 自動播放推進各年份數據，地圖設色平滑漸變 |
| 點擊「未匹配」警示列 | 開啟未匹配診斷面板，檢視未匹配清單並可進行手動別名關聯映射 |
| 點擊「專案存檔」 | 將目前工作區存入瀏覽器 IndexedDB，或匯出 `.geodata.json` 備份檔 |
| 點擊「底圖風格」 | 即時切換 CARTO Dark、CARTO Positron、OpenStreetMap 或 ESRI 衛星圖 |
| 點擊「匯出 PNG」 | 捕獲當前渲染地圖為高畫質圖檔 |

## 空間資料與未匹配防護

- **絕不捏造座標**：CSV 記錄若無對應 GeoJSON 多邊形邊界，系統嚴格將其隔離於未匹配清單，絕不在地圖上隨意填補假座標或假點位
- **手動別名映射**：使用者可將 CSV 欄位鍵值（如自訂代碼）手動對應至圖資現有代碼，確認關聯後即時併入地圖
- **異常防護**：自動攔截空檔案（0 Bytes）、格式錯誤 JSON、非 FeatureCollection 結構及大於 50MB 之大檔案

## 專案結構

| 路徑 | 用途 |
| --- | --- |
| `src/App.tsx` | 工作台核心狀態、資料生命週期與響應式排版整合 |
| `src/components/Map/ChoroplethMap.tsx` | MapLibre GL JS 地圖圖層、底圖切換與畫布互動 |
| `src/components/Map/RegionDetailCard.tsx` | 選取區域屬性檢視卡片（支援獨立文檔流排版） |
| `src/components/Charts/EChartsAnalytics.tsx` | ECharts 五階文檔流圖表面板（排行、趨勢、分佈） |
| `src/components/Filters/FilterBar.tsx` | 指標切換、文字即時搜尋與數值門檻過濾列 |
| `src/components/Legend/Legend.tsx` | 四種分級演算法切換、色盤挑選與區間過濾圖例 |
| `src/components/Timeline/TimeSlider.tsx` | 多期時序播放控制器與年份離散選取器 |
| `src/components/Ranking/Leaderboard.tsx` | 區域排序列表與 KPI 統計指標卡片 |
| `src/components/Table/DataTableModal.tsx` | 完整空間資料表格、未匹配清單檢視與 CSV 匯出 |
| `src/components/Unmatched/UnmatchedMapperModal.tsx` | 未匹配紀錄診斷面板與手動別名關聯映射工具 |
| `src/components/Project/ProjectManagerModal.tsx` | IndexedDB 專案存檔、讀取管理與備份還原 |
| `src/utils/dataMerge.ts` | 鍵值正規化、候選代碼自動偵測與嚴格未匹配隔離演算法 |
| `src/utils/colorScales.ts` | Jenks 自然間斷法、Quantile、Equal、Log 統計計算 |
| `src/services/storage.ts` | IndexedDB 存取封裝與工作區 JSON 序列化 |
| `src/services/theme.ts` | System、Light、Dark 黑白雙主題管理與系統偏好監聽 |
| `tests/e2e/workbench.spec.ts` | 工作台端到端核心功能自動化測試流程 |
| `tests/e2e/responsive-theme-verification.spec.ts` | 九大 Viewport RWD、雙主題與零重疊檢驗測試 |

## 第三方說明

| 項目 | 說明 |
| --- | --- |
| React · React DOM · Vite | 依 React 與 Vite 開源授權 |
| MapLibre GL JS | 向量地圖開源渲染引擎，依 BSD-3-Clause 授權 |
| Apache ECharts | 視覺化圖表庫，依 Apache-2.0 授權 |
| CARTO · OpenStreetMap · ESRI | 公開合法底圖圖資，依各圖資服務商標註條款顯示出處 |
| Tailwind CSS · Lucide React · idb · PapaParse | 依各套件開源授權 |

本專案的原創架構、設計介面、計算模組、測試腳本與文案，適用下方專案授權

## 連結

| | |
| --- | --- |
| 倉庫 | [geo-data-explorer](https://github.com/ReiKama414/geo-data-explorer) |
| 作者 | [ReiKama414](https://github.com/ReiKama414) |
| 作品集 | [個人網站](https://reikama414.vercel.app/) |
| 授權全文 | [LICENSE](./LICENSE) |

## License / 權限

Copyright (c) ReiKama414. All rights reserved.

本專案僅供個人瀏覽與學習。未經著作權人書面同意，
不得使用、複製、修改、散布或併入其他專案（含非商業用途）

- [GitHub](https://github.com/ReiKama414/geo-data-explorer)
- [個人網站](https://reikama414.vercel.app/)
- [授權全文](./LICENSE)

---

<sub>GEO DATA EXPLORER · 地理空間資料分析工作台 · ReiKama414 · 2026</sub>
