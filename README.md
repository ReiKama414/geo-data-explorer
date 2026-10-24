# Geo Data Explorer (地理資料分析與分級設色平台)

Geo Data Explorer 是一個專為地理空間資料分析打造的高效能 Web 應用程式。使用者可匯入標準 **GeoJSON** 幾何圖資與包含地區指標的 **CSV** 表格，依據行政區代碼或自訂鍵值自動進行資料關聯合併（Data Join），即時生成分級設色地圖（Choropleth Map）、互動式圖例、時序切換軸、全域排名榜與完整資料診斷表。

本專案完全由前端本機（Client-side）處理，資料不外傳，並已針對 **Cloudflare Pages** 靜態託管完成最佳化配置。

---

## ✨ 核心特色與功能

### 1. 空間資料合併引擎 (Data Join Engine)
- **多格式匯入**：支援 GeoJSON（Polygon / MultiPolygon）與 CSV（自動處理 UTF-8、去除 BOM、自動探測分隔符號與欄位形態）。
- **智慧欄位偵測**：自動識別候選地區代碼（如 `COUNTYCODE`、`ISO3`、`id`、`code`）、時間維度欄位（`year`、`date`）及各項連續型數值指標。
- **嚴謹處理未匹配地區（絕不捏造座標）**：
  - 若 CSV 記錄中的地區代碼在 GeoJSON 中找不到幾何多邊形，**絕不隨機產生假經緯度點位**，確保地理科學研究真實性。
  - 提供專屬「未匹配資料處理面板」與診斷標籤，標註失敗原因、原始資料列與數值，並提供手動別名映射（Manual Alias Mapping）與未匹配 CSV 報告匯出功能。
  - 對於有幾何形狀但缺乏 CSV 指標的區域，地圖上以中性無資料網底顯示，避免誤導。

### 2. 高效向量地圖渲染 (MapLibre GL JS)
- **合法公開底圖來源與標註**：
  - CARTO Positron（淺色簡約）
  - CARTO Dark Matter（深色儀表板）
  - OpenStreetMap（OSM 開放街道圖）
  - ESRI World Imagery（高解析衛星空照圖）
  - 遵循公開授權條款，地圖右下方常駐合法來源標記（Attribution Control）。
- **互動操作**：平滑縮放、平移、自動對焦至資料外框範圍（Fit Bounds）、滑鼠懸浮資訊浮層（Tooltip）、點選高亮顯示與詳情卡片。
- **高解析地圖匯出**：內建一鍵輸出當前地圖畫面截圖（PNG）。

### 3. 動態分級設色與互動式圖例 (Classification & Legend)
- **4 種科學統計分級演算法**：
  - **自然間斷法 (Jenks Natural Breaks)**：極小化組內變異、極大化組間差異，適合多數自然與社會經濟數據。
  - **分位數法 (Quantiles)**：各區間分配相同數量的地區，適合觀察相對排名。
  - **等距分級法 (Equal Intervals)**：最大值與最小值均等切分。
  - **對數分級法 (Logarithmic)**：適合高度偏態（Skewed）分佈資料（如人口、GDP）。
- **9 款專業漸層色盤**：
  - 連續型（Sequential）：Viridis、Plasma、深海湛藍 (Blues)、自然翠綠 (Greens)、暖陽暖橘 (Oranges)、典雅紫韻 (Purples)
  - 雙極發散型（Diverging）：紅白綠 (RdYlGn)、紅白藍 (RdBu)、全光譜 (Spectral)
  - 支援色階反轉（Invert Palette）與 3 至 8 階分級自訂。
- **圖例區間過濾**：點擊圖例中特定色階區間，可即時過濾地圖與總表，僅高亮屬於該區間的區域。

### 4. 時間序列動態切換 (Timeline Player)
- 若 CSV 資料包含時間維度（如 2020 - 2024 年度），自動啟動時序控制列。
- 提供「自動播放 / 暫停」、「逐步前進 / 後退」與「速度倍率調整（1x / 2x）」，地圖顏色與全域排行榜隨時間軸推進動態重繪。

### 5. 區域排名榜與統計 KPI (Leaderboard & Statistics)
- 即時計算當前指標的 **最大值、最小值、平均值、中位數、標準差**。
- 視覺化排名條狀圖（Top 10 / 全域排行），標示金銀銅排名徽章與百分位數。
- 點擊排名項目即可於地圖中定位該區域。

### 6. 多維度篩選與全域搜尋 (Filters)
- 地區名稱或代碼即時關鍵字過濾。
- 數值指標門檻滑桿（Range Filter），即時排除過高或過低之離群值。

### 7. 資料總表與匯出 (Data Table & Export)
- 分頁瀏覽已合併空間資料，支援任一欄位點擊排序。
- 匯出合併後的新 GeoJSON（屬性已嵌入 CSV 最新數值）。
- 匯出合併後的完整 CSV 與未匹配異常報表。

---

## 🗂️ 內建預設資料庫

專案內建 3 套高品質的多期範例資料，開箱即可體驗：
1. 🇹🇼 **台灣各縣市發展指標 (2020 - 2024)**
   - 涵蓋全台 22 縣市（代碼與內政部戶政代碼 63000、64000 等相容）。
   - 指標：人口數、綜合所得中位數（千元）、老化指數、太陽光電容量（MW）、平均房價（萬/坪）。
   - **故意包含 2 筆非建制特定保護區資料**（`99999`、`88888`），示範未匹配資料保留與不捏造座標機制。
2. 🌍 **全球國家發展指標 (2020 - 2024)**
   - 向量國界（Natural Earth），包含 177 個主權國家（ISO3 代碼）。
   - 指標：人均 GDP (USD)、預期壽命、再生能源比例 (%)、網路普及率 (%)。
   - 包含國際科學考察代碼未匹配範例。
3. 🇺🇸 **美國各州經濟與綠能 (2021 - 2024)**
   - 涵蓋全美 52 州與特區（州代碼 CA, NY, TX 等）。
   - 指標：家庭收入中位數、電動車普及率 (EV %)、潔淨綠能發電佔比。

---

## 🚀 本地開發與建置

### 環境需求
- Node.js 18+ (建議 Node.js 20+)
- npm 9+

### 步驟
```bash
# 1. 複製專案並安裝依賴套件
npm install

# 2. 啟動本機開發伺服器
npm run dev

# 3. 生產環境靜態編譯
npm run build

# 4. 本機預覽編譯成品
npm run preview
```

---

## ☁️ Cloudflare Pages 部署指南

本專案為純前端單頁應用程式（SPA），產出目錄為標準 `dist/`，完全相容於 Cloudflare Pages。

### 方式一：透過 Cloudflare Dashboard (推薦，具備自動 CI/CD)
1. 將專案推送到 GitHub / GitLab 儲存庫。
2. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)，點選 **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**。
3. 選擇本專案儲存庫，填入下列建置參數：
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node.js version**: `20` (可在 Environment variables 中設定 `NODE_VERSION=20`)
4. 點選 **Save and Deploy**，建置完成即可獲得 `https://<專案名>.pages.dev` 網址。

### 方式二：使用 Wrangler CLI 直接本機部署
```bash
# 1. 編譯專案
npm run build

# 2. 使用 wrangler 直推部署至 Cloudflare Pages
npx wrangler pages deploy dist --project-name=geo-data-explorer
```

> **已隨附的 Cloudflare 設定檔**：
> - `public/_redirects`：確保 SPA 單頁路由跳轉不出現 404（`/* /index.html 200`）。
> - `public/_headers`：設定靜態資源快取原則（Cache-Control）與基本安全標頭。

---

## ⚖️ 授權與地圖圖資聲明

- **MapLibre GL JS**: BSD 3-Clause License
- **OpenStreetMap**: © [OpenStreetMap 貢獻者](https://www.openstreetmap.org/copyright)，依據 ODbL 授權。
- **CARTO Basemaps**: © [CARTO](https://carto.com/attributions)，適用於非商業與合法公開網路服務。
- **ESRI World Imagery**: Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community.
