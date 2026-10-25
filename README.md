# Geo Data Explorer (地理資料分析與分級設色專業工作台)

Geo Data Explorer 是一個專為地理空間資料分析打造的正式前端工作台（Workbench）。本系統非展示型 Mockup，全功能可操作、可離線運算、可測試並可直接部署於 **Cloudflare Pages**。

---

## 🛠️ 技術架構

- **核心框架**: React 19 + TypeScript + Vite + Tailwind CSS
- **地圖渲染引擎**: MapLibre GL JS（向量多邊形渲染、平滑設色、互動高亮與視角自適應）
- **圖表分析庫**: Apache ECharts（各區橫向柱狀排行、多期時間序列趨勢折線圖、分級分佈直方圖）
- **本機資料持久化**: IndexedDB（透過 `idb` 封裝，支援專案命名存檔、自動還原工作區、工作區 JSON 匯出/匯入）
- **表格與數據處理**: PapaParse（CSV 解析與 RFC 4180 匯出）、d3-scale / d3-array（Jenks 自然間斷、分位數、等距與對數演算法）
- **驗證與測試體系**: Vitest 核心計算單元測試 + Playwright E2E 完整流程自動化測試

---

## 🧭 核心功能與工程規範

### 1. 空間資料合併與真實性保障（絕不捏造座標）
- **多格式匯入**: 支援標準 GeoJSON（Polygon / MultiPolygon）與 CSV（自動偵測標題、去除 UTF-8 BOM、容錯逗號與分號）。
- **嚴謹處理未匹配地區**:
  - 若 CSV 記錄中的代碼在圖資中無對應幾何多邊形，**絕不捏造或隨意推測經緯度座標**。
  - 專屬「未匹配資料處理面板」列出原始記錄、列號與未匹配原因，並提供**手動別名映射（Manual Alias Mapper）**以建立關聯，亦可匯出未匹配 CSV 診斷報表。
  - 圖資中存在但無 CSV 數據的區域，地圖上以中性無資料網底顯示。
- **異常與邊界保護**: 嚴格攔截空檔案（0 Bytes）、格式損毀 JSON、非 FeatureCollection 結構與超大檔案（> 50MB 警示）。

### 2. 合法公開地圖來源與標註
常駐 MapLibre Attribution 標記，完全合規使用下列合法圖資：
1. **CARTO Dark Matter**: 深色極簡工作台底圖
2. **CARTO Positron**: 淺色清晰圖資
3. **OpenStreetMap**: 標準開源街道地圖
4. **ESRI World Imagery**: 高解析衛星影像空照圖

### 3. 動態分級設色與圖例過濾
- **4 種統計分級演算法**:
  - 自然間斷法 (Jenks Natural Breaks)
  - 分位數法 (Quantiles)
  - 等距分級法 (Equal Intervals)
  - 對數分級法 (Logarithmic)
- **9 款專業漸層色盤**: Viridis, Plasma, Blues, Greens, Oranges, Purples, RdYlGn, RdBu, Spectral（支援反轉方向與 3~8 階切換）。
- **圖例區間互動過濾**: 點選任一色階即可單獨隔離該區間的地圖圖徵與表格。

### 4. ECharts 專業分析圖表面板
- **區域排名柱狀圖**: 水平排序柱狀圖，長條顏色與地圖設色完全同步，點擊長條即可直接於地圖定位選取。
- **時序趨勢走勢圖**: 自動彙整多期年份（如 2020-2024）數據，呈現重點區域或選取地區的成長軌跡。
- **分級分佈直方圖**: 視覺化各分級階層所涵蓋之地區個數分佈。

### 5. 時間軸動態推進 (Timeline Player)
- 具備自動播放/暫停、單步前進/後退、播放速率切換（1x / 2x）與離散年份滑桿。

### 6. 本機 IndexedDB 專案持久化
- 支援命名儲存至瀏覽器 IndexedDB。
- 專案清單即時瀏覽、還原載入與刪除。
- 支援將整體工作區狀態匯出為 `.geodata.json` 檔案或由此備份檔還原。

### 7. 真實檔案匯出
- **匯出合併後 GeoJSON**: 內嵌最新計算數值與排名屬性。
- **匯出合併後 CSV**: 包含所有維度指標。
- **匯出未匹配異常清單 CSV**: 供後續資料清洗與對帳。
- **匯出地圖畫布截圖 (PNG)**: 捕獲當前渲染地圖。

---

## 🗃️ 內建預設資料庫

1. 🇹🇼 **台灣各縣市發展指標 (2020 - 2024)**：全台 22 縣市（代碼與內政部標準相容），包含人口、所得中位數、老化指數、太陽能容量、平均房價。內含 2 筆非建制特定保護區資料（`99999`、`88888`）供測試未匹配機制。
2. 🌍 **全球各國發展指標 (2020 - 2024)**：177 國主權國界，包含人均 GDP、預期壽命、再生能源比例、網路普及率。
3. 🇺🇸 **美國各州經濟與綠能 (2021 - 2024)**：52 州/特區，包含家庭收入中位數、電動車新車佔比、潔淨綠能發電佔比。

---

## 🧪 測試與驗證

本專案實施嚴格的品質與自動化測試：

```bash
# 1. 執行核心計算單元測試 (Vitest)
npm test

# 2. 執行 TypeScript 型別檢查
npx tsc -b

# 3. 執行生產環境編譯
npm run build

# 4. 執行 Playwright 瀏覽器端真實互動 E2E 測試
npm run test:e2e
```

### 測試覆蓋項目
- `src/utils/dataMerge.test.ts`: 欄位正規化、候選代碼探測、時序提取、數值欄位探測、空間合併、**未匹配記錄孤立且絕不產生虛假座標**、手動別名映射、異常空輸入保護。
- `src/utils/colorScales.test.ts`: Jenks、Quantile、Equal Interval、Logarithmic 分級演算、色盤反轉、數值格式化。
- `src/services/storage.test.ts`: IndexedDB 專案儲存、專案清單讀取、專案還原載入、專案刪除。
- `tests/e2e/workbench.spec.ts`: 初始化工作區載入、指標切換與關鍵字搜尋、時序播放控制、資料總表開啟與未匹配記錄驗證、未匹配別名映射對話框、ECharts 與排行榜切換、IndexedDB 專案管理對話框。

---

## ☁️ Cloudflare Pages 部署設定

本專案為無伺服器純前端架構，產物集中於 `dist/`，完全開箱即用於 Cloudflare Pages。

### Git CI/CD 自動部署
1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**。
2. 選擇本專案儲存庫，配置下列建置參數：
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **環境變數**: `NODE_VERSION=20`
3. 點選 **Save and Deploy** 即可完成全球邊緣發布。

### 本機 Wrangler 快速發布
```bash
npm run build
npx wrangler pages deploy dist --project-name=geo-data-explorer
```

> 靜態附帶檔案：
> - `public/_redirects`: 支援 SPA 單頁應用程式深層路由重導（`/* /index.html 200`）。
> - `public/_headers`: 設定靜態資源與圖資快取標頭及安全性標頭。

---

## ⚠️ 已知限制與硬體考量

1. **圖資幾何複雜度**: 單一 GeoJSON 多邊形頂點數若超過 100 萬點，瀏覽器端解析與記憶體消耗較大，建議先在 QGIS 或 mapshaper 中簡化幾何至 0.001 容差。
2. **WebGL 2.0 支援**: MapLibre GL JS 依賴客戶端瀏覽器之 WebGL 支援。在極少數停用硬體加速之虛擬機器中，地圖繪製效能可能受限。
3. **無伺服器本機儲存**: IndexedDB 資料受限於使用者各別瀏覽器之配額限制（一般現代瀏覽器提供硬碟可用空間之數 GB 配額，足供儲存數百個專案）。
