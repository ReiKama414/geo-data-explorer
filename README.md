# GEO DATA EXPLORER

**English** · [繁體中文](./README.zh-TW.md)

> **Geospatial Data Analysis & Choropleth Workbench** — Pure client-side, offline computation supporting GeoJSON & CSV multidimensional joins, dynamic timeline progression, and statistical charts

<p align="center">
  <a href="https://github.com/ReiKama414/geo-data-explorer">Star</a>
  ·
  <a href="https://reikama414.vercel.app/">Portfolio</a>
  ·
  <a href="#quick-start">Quick start</a>
  ·
  <a href="#license--rights">License</a>
</p>

---

## Why

Geospatial data (such as regional statistics, demographic indicators, and environmental metrics) are frequently fragmented across tabular spreadsheets and vector boundary files. Traditional desktop GIS software is heavy and demands cumbersome configuration. This project delivers an out-of-the-box modern Web workbench: one-click import for GeoJSON and CSV, automated identifier key matching, statistical choropleth classification, timeline playback, and pure client-side processing with zero backend database or paid external API dependencies.

## Highlights

- **Authentic data joins** — Supports standard GeoJSON and CSV with automated key detection, metric column discovery, and multi-period time extraction
- **Strict unmatched protection** — For CSV rows without corresponding polygon boundaries, **never fabricate or guess fake coordinates**, providing a dedicated diagnostic inspector, manual alias mapper, and unmatched CSV report export
- **Four statistical classification methods** — Jenks Natural Breaks, Quantiles, Equal Intervals, and Logarithmic scaling with nine continuous palettes and bin count adjustments
- **ECharts analytics panel** — Structured in a strict five-tier document flow (Header, Description, Statistics, Chart, Legend/Footer) featuring regional ranking bars, multi-period trend lines, and distribution histograms
- **Dynamic timeline player** — Smooth transitions across multiple discrete periods with auto-play, step navigation, and playback speed controls
- **Dual-theme support** — Full support for System, Light, and Dark modes, tracking system preferences in real time with synchronized basemap and chart themes
- **Local IndexedDB persistence** — Automatic workspace session autosave, named project saving, project recovery, and JSON workspace backup import/export
- **Responsive design & zero unintended overlap** — Engineered and verified across nine viewports (320px to 1920px) with zero horizontal page scrollbars and non-colliding floating panels

## Tech stack

| Area | Choice |
| --- | --- |
| Core application | React 19 · TypeScript · Vite · Tailwind CSS 4 |
| Mapping engine | MapLibre GL JS (vector polygon rendering, dynamic choropleth styling, feature highlighting) |
| Chart analytics | Apache ECharts 6 (horizontal ranking bars, multi-period line trends, distribution histograms) |
| Spatial statistics | d3-scale · d3-array (Jenks natural breaks, Quantile, Equal, Logarithmic algorithms) |
| Tabular processing | PapaParse (CSV parsing and RFC 4180 export) |
| Client storage | IndexedDB (wrapped with `idb` for project saving and session backup) |
| Icons / Typography | Lucide React · Inter · JetBrains Mono |
| Quality assurance | Vitest calculation unit tests · Playwright multi-viewport E2E verification |

## Quick start

Node.js 20+ recommended.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

Production build:

```bash
npm run build
npm run preview
```

Static assets are generated in `dist/`, fully compliant with Cloudflare Pages deployment requirements.

### Test suite

```bash
# Run calculation unit tests (Vitest)
npm test

# Run TypeScript type check
npx tsc -b

# Run Playwright real browser E2E test suite
npm run test:e2e
```

## Controls

| Action | Result |
| --- | --- |
| Click region polygon | Highlights the polygon and displays its full attributes, ranking, and percentile in the side dock |
| Change active metric | Recalculates choropleth color classification, statistics cards, ECharts visualizer, and leaderboard |
| Drag range slider | Filters and isolates regions within the specified numeric threshold |
| Search name or ID | Filters regions matching the keyword; non-matching regions are rendered translucent |
| Click legend interval | Filters and displays only spatial features belonging to that value bin |
| Click timeline player | Advances through yearly time dimensions with smooth color transitions |
| Click unmatched badge | Opens diagnostic panel to inspect unmatched records and assign manual alias joins |
| Click "Project save" | Persists the workspace to browser IndexedDB or exports a `.geodata.json` backup file |
| Switch basemap style | Toggles between CARTO Dark Matter, CARTO Positron, OpenStreetMap, or ESRI World Imagery |
| Click "Export PNG" | Captures high-resolution canvas screenshot of the current map view |

## Spatial data integrity & unmatched isolation

- **No coordinate fabrication**: When a CSV record has no matching GeoJSON boundary polygon, the record is strictly quarantined in the unmatched diagnostic pool. Coordinates are never guessed or randomly synthesized.
- **Manual alias mapper**: Users can pair unmatched CSV keys with existing GeoJSON identifiers to resolve discrepancies and integrate records in real time.
- **Boundary guardrails**: Rejects empty files (0 Bytes), malformed JSON, non-FeatureCollection structures, and oversized files (> 50MB warning).

## Project structure

| Path | Role |
| --- | --- |
| `src/App.tsx` | Core workbench state management, data lifecycle, and responsive layout flow |
| `src/components/Map/ChoroplethMap.tsx` | MapLibre GL JS layer management, basemap synchronization, and canvas interactions |
| `src/components/Map/RegionDetailCard.tsx` | Selected region inspection card in document flow |
| `src/components/Charts/EChartsAnalytics.tsx` | ECharts five-tier document flow panel (ranking, trends, distribution) |
| `src/components/Filters/FilterBar.tsx` | Metric dropdown, keyword search, and threshold range slider bar |
| `src/components/Legend/Legend.tsx` | Classification algorithm selector, palette picker, and interval filter legend |
| `src/components/Timeline/TimeSlider.tsx` | Multi-period animation controls and discrete period selector |
| `src/components/Ranking/Leaderboard.tsx` | Region leaderboard gauge list and summary KPI cards |
| `src/components/Table/DataTableModal.tsx` | Unified data table, unmatched list view, and CSV export modal |
| `src/components/Unmatched/UnmatchedMapperModal.tsx` | Diagnostic inspector and manual alias remapping dialog |
| `src/components/Project/ProjectManagerModal.tsx` | IndexedDB project persistence and JSON workspace backup |
| `src/utils/dataMerge.ts` | Normalization, join candidate detection, and strict unmatched isolation algorithm |
| `src/utils/colorScales.ts` | Jenks, Quantile, Equal Interval, and Logarithmic classification algorithms |
| `src/services/storage.ts` | IndexedDB operations and session serialization |
| `src/services/theme.ts` | System, Light, and Dark dual-theme management with OS preference listener |
| `tests/e2e/workbench.spec.ts` | End-to-end user journey automation tests |
| `tests/e2e/responsive-theme-verification.spec.ts` | 9-viewport responsive layout, dual themes, and zero-overlap verification |

## Third-party notices

| Item | Notice |
| --- | --- |
| React · React DOM · Vite | Distributed under their respective open-source licenses |
| MapLibre GL JS | Open-source vector mapping engine under BSD-3-Clause license |
| Apache ECharts | Visualization chart library under Apache-2.0 license |
| CARTO · OpenStreetMap · ESRI | Public lawful tile services with persistent attribution notices |
| Tailwind CSS · Lucide React · idb · PapaParse | Distributed under their respective open-source licenses |

Original software architecture, visual interface designs, computational modules, test suites, and documentation are governed by the project license below.

## Links

| | |
| --- | --- |
| Repository | [geo-data-explorer](https://github.com/ReiKama414/geo-data-explorer) |
| Author | [ReiKama414](https://github.com/ReiKama414) |
| Portfolio | [個人網站](https://reikama414.vercel.app/) |
| Full license | [LICENSE](./LICENSE) |

## License / 權限

Copyright (c) ReiKama414. All rights reserved.

本專案僅供個人瀏覽與學習。未經著作權人書面同意，
不得使用、複製、修改、散布或併入其他專案（含非商業用途）

- [GitHub](https://github.com/ReiKama414/geo-data-explorer)
- [個人網站](https://reikama414.vercel.app/)
- [授權全文](./LICENSE)

---

<sub>GEO DATA EXPLORER · Geospatial Data Workbench · ReiKama414 · 2026</sub>
