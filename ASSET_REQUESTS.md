# ComfyUI Image Asset Specifications (ASSET_REQUESTS)

本專案堅持「專業工作台風格」，避免過量裝飾與無意義插圖。若未來需要視覺輔助資源，請依下列 Prompt 與規格透過 ComfyUI 產生，並放置於 `src/assets/` 目錄。

---

## 1. 應用程式向量標誌 (App Icon / Favicon)
- **檔案命名**: `src/assets/logo.png`
- **尺寸規格**: 512x512 px (PNG 格式，透明背景)
- **用途說明**: 頂部選單列與瀏覽器頁籤 Favicon 標誌
- **ComfyUI 建議工作流**:
  - **Checkpoints**: `v1-5-pruned-emaonly.safetensors` 或 `SDXL_base_1.0.safetensors`
  - **Prompt**:
    ```text
    (minimalist geometric compass logo:1.3), cartography map pin, choropleth polygon grid, clean modern vector icon, flat design, cyan and navy blue palette, high contrast, clean white background, no text, 8k resolution, crisp vector edges
    ```
  - **Negative Prompt**:
    ```text
    3d realistic, photograph, text, watermark, blurry, noise, ugly, complex gradients, glow, particles
    ```
  - **現行替代方案**: 使用內建 `public/favicon.svg` 簡潔 SVG 向量圖示，功能完全不阻塞。

---

## 2. 空白狀態插圖 (Empty State / No Data Placeholder)
- **檔案命名**: `src/assets/empty-state.png`
- **尺寸規格**: 800x600 px (PNG 格式，乾淨深底)
- **用途說明**: 當使用者清空資料或匯入空檔案時之提示插圖
- **ComfyUI 建議工作流**:
  - **Checkpoints**: `SDXL_base_1.0.safetensors`
  - **Prompt**:
    ```text
    (minimalist blueprint schematic of a world map:1.2), technical architectural diagram, dark slate background #0f172a, thin cyan vector lines, clean isometric grid, subtle geospatial contours, professional CAD workstation aesthetic, no text
    ```
  - **Negative Prompt**:
    ```text
    fantasy, colorful, glow, neon, particles, glassmorphism, messy, low quality, text, labels
    ```
  - **現行替代方案**: 使用 Lucide `FileQuestion` / `MapPinOff` 向量圖示與明確提示文字，功能完整且清晰。
