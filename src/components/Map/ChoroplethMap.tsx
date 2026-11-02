import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Map as MapLibreMap, Popup, GeoJSONSource, setWorkerUrl } from 'maplibre-gl';
// MapLibre v6 以 import.meta.url 推導 worker 檔案位置；經 Vite 打包後該路徑不存在，
// 會導致 "Worker failed to load" 且地圖 / 多邊形完全不顯示，必須明確指定 worker URL。
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import {
  Layers,
} from 'lucide-react';
import type {
  CustomFeatureCollection,
  BasemapStyle,
  LegendBreak,
} from '../../types';
import type { ResolvedTheme } from '../../services/theme';
import { BASEMAP_CONFIGS, createRasterStyle } from '../../utils/basemaps';
import { getColorForValue, formatNumber } from '../../utils/colorScales';

setWorkerUrl(maplibreWorkerUrl);

const SOURCE_ID = 'choropleth-source';

// 防止匯入資料中的 HTML 字元被注入 Popup（XSS / 版面破壞）
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 計算 fitBounds 的 padding：小螢幕縮減；桌面版（>=1024）右側有浮動面板，需預留空間避免資料被蓋住
function getFitPadding(map: MapLibreMap, base: number) {
  const { clientWidth: w, clientHeight: h } = map.getContainer();
  const pad = Math.max(8, Math.min(base, w / 6, h / 6));
  const rightPad = w >= 1024 ? Math.min(380, w * 0.35) : pad;
  return { top: pad, bottom: pad, left: pad, right: rightPad };
}

/** 全球或近全球邊界：對 360° 做 fitBounds 會算出過低的 zoom，寬螢幕上同時看到多份世界而像破版；改用手動 overview zoom，仍保留 renderWorldCopies 以便拖曳環繞。 */
function isGlobalBounds(bounds: [number, number, number, number]) {
  const [minLng, minLat, maxLng, maxLat] = bounds;
  const lngSpan = maxLng - minLng;
  const latSpan = maxLat - minLat;
  return lngSpan >= 280 || (lngSpan >= 200 && latSpan >= 100);
}

/** 依容器寬高推算「單一世界」概覽 zoom（Mercator：zoom 0 時世界寬 ≈ 512px） */
function computeGlobalOverviewZoom(
  map: MapLibreMap,
  padding: { top: number; bottom: number; left: number; right: number }
) {
  const { clientWidth: w, clientHeight: h } = map.getContainer();
  const effW = Math.max(96, w - padding.left - padding.right);
  const effH = Math.max(96, h - padding.top - padding.bottom);
  const worldPxAtZoom0 = 512;
  const zoomForWidth = Math.log2(effW / worldPxAtZoom0);
  const zoomForHeight = Math.log2(effH / worldPxAtZoom0) - 0.2;
  return Math.max(0.85, Math.min(zoomForWidth, zoomForHeight, 2.35));
}

function applyDataViewport(
  map: MapLibreMap,
  bounds: [number, number, number, number],
  options?: { maxZoom?: number; duration?: number; paddingBase?: number }
) {
  const padding = getFitPadding(map, options?.paddingBase ?? 60);
  const duration = options?.duration ?? 1000;

  if (isGlobalBounds(bounds)) {
    const [minLng, minLat, maxLng, maxLat] = bounds;
    let centerLng = (minLng + maxLng) / 2;
    if (centerLng > 180) centerLng -= 360;
    if (centerLng < -180) centerLng += 360;
    const centerLat = Math.max(-45, Math.min(50, (minLat + maxLat) / 2));
    map.easeTo({
      center: [centerLng, centerLat],
      zoom: computeGlobalOverviewZoom(map, padding),
      padding,
      duration,
    });
    return;
  }

  map.fitBounds(bounds, {
    padding,
    maxZoom: options?.maxZoom ?? 12,
    duration,
  });
}

// 加入（或在換底圖後重新加入）分級設色圖層
function addChoroplethLayers(map: MapLibreMap, data: CustomFeatureCollection) {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, { type: 'geojson', data: data as any });
  }
  if (!map.getLayer('choropleth-fill')) {
    map.addLayer({
      id: 'choropleth-fill',
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': ['get', '_displayColor'],
        'fill-opacity': ['get', '_opacity'],
      },
    });
  }
  if (!map.getLayer('choropleth-stroke')) {
    map.addLayer({
      id: 'choropleth-stroke',
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': ['get', '_strokeColor'],
        'line-width': ['get', '_strokeWidth'],
        'line-opacity': 0.9,
      },
    });
  }
}

interface ChoroplethMapProps {
  geojson: CustomFeatureCollection;
  breaks: LegendBreak[];
  metricColumn: string;
  selectedRegionId: string | number | null;
  onSelectRegion: (id: string | number | null) => void;
  selectedBreakIndex: number | null;
  searchFilter: string;
  rangeFilter: [number, number] | null;
  resolvedTheme?: ResolvedTheme;
  onMapReady?: (map: MapLibreMap) => void;
}

export const ChoroplethMap: React.FC<ChoroplethMapProps> = ({
  geojson,
  breaks,
  metricColumn,
  selectedRegionId,
  onSelectRegion,
  selectedBreakIndex,
  searchFilter,
  rangeFilter,
  resolvedTheme = 'dark',
  onMapReady,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const userSelectedBasemapRef = useRef<boolean>(false);
  const [basemap, setBasemap] = useState<BasemapStyle>(
    resolvedTheme === 'dark' ? 'carto-dark' : 'carto-positron'
  );
  const appliedBasemapRef = useRef<BasemapStyle>(basemap);
  // 以 ref 保存最新的 callback / 欄位，避免地圖事件處理器（只註冊一次）讀到過期的閉包
  const metricColumnRef = useRef(metricColumn);
  const onSelectRegionRef = useRef(onSelectRegion);
  const onMapReadyRef = useRef(onMapReady);
  useEffect(() => {
    metricColumnRef.current = metricColumn;
    onSelectRegionRef.current = onSelectRegion;
    onMapReadyRef.current = onMapReady;
  });
  const [showBasemapMenu, setShowBasemapMenu] = useState(false);

  // Sync basemap with theme if user hasn't explicitly chosen a specific style
  useEffect(() => {
    if (!userSelectedBasemapRef.current) {
      setBasemap(resolvedTheme === 'dark' ? 'carto-dark' : 'carto-positron');
    }
  }, [resolvedTheme]);

  // Helper to calculate bounding box of a GeoJSON
  const getBounds = useCallback((data: CustomFeatureCollection): [number, number, number, number] | null => {
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    const traverse = (coords: any) => {
      if (!Array.isArray(coords)) return;
      if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        const [lng, lat] = coords;
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      } else {
        coords.forEach(traverse);
      }
    };

    data.features.forEach((f) => {
      if (f.geometry && 'coordinates' in f.geometry) {
        traverse(f.geometry.coordinates);
      }
    });

    if (minLng === Infinity || minLat === Infinity) return null;
    return [minLng, minLat, maxLng, maxLat];
  }, []);

  // Enrich GeoJSON with display colors and filter flags
  const prepareColoredGeoJSON = useCallback((): CustomFeatureCollection => {
    const searchLower = searchFilter.trim().toLowerCase();

    const enrichedFeatures = geojson.features.map((feature, idx) => {
      const props = { ...(feature.properties || {}) };
      const val = props._metricValue;
      const isMatched = props._matched === true;
      const featureId = String(props._idKey ?? idx);

      // Color from breaks
      let color = '#334155'; // default slate for unmatched
      if (isMatched && typeof val === 'number') {
        color = getColorForValue(val, breaks, '#475569');
      }

      // Check if feature passes active filters
      let passesFilter = true;

      // 1. Legend bin filter
      if (selectedBreakIndex !== null && breaks[selectedBreakIndex]) {
        const targetBreak = breaks[selectedBreakIndex];
        if (typeof val === 'number') {
          if (selectedBreakIndex === breaks.length - 1) {
            passesFilter = val >= targetBreak.min && val <= targetBreak.max;
          } else {
            passesFilter = val >= targetBreak.min && val < targetBreak.max;
          }
        } else {
          passesFilter = false;
        }
      }

      // 2. Search text filter
      if (passesFilter && searchLower) {
        const name = String(props._regionName || '').toLowerCase();
        const code = String(props._joinKey || '').toLowerCase();
        passesFilter = name.includes(searchLower) || code.includes(searchLower);
      }

      // 3. Range slider filter
      if (passesFilter && rangeFilter && typeof val === 'number') {
        passesFilter = val >= rangeFilter[0] && val <= rangeFilter[1];
      }

      props._displayColor = color;
      props._opacity = passesFilter ? (isMatched ? 0.85 : 0.35) : 0.12;
      const isSelected = selectedRegionId !== null && featureId === String(selectedRegionId);
      props._strokeWidth = isSelected ? 3.5 : 1.2;
      props._strokeColor =
        isSelected
          ? '#fbbf24' // gold for selected
          : passesFilter
          ? (resolvedTheme === 'dark' ? '#e2e8f0' : '#475569')
          : (resolvedTheme === 'dark' ? '#475569' : '#cbd5e1');
      props._idKey = String(featureId);

      return {
        ...feature,
        id: idx, // numeric id for MapLibre feature state
        properties: props,
      };
    });

    return {
      type: 'FeatureCollection',
      features: enrichedFeatures,
    };
  }, [geojson, breaks, selectedBreakIndex, searchFilter, rangeFilter, selectedRegionId, resolvedTheme]);

  // Fit bounds to current dataset
  const fitToDataBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const b = getBounds(geojson);
    if (b) {
      applyDataViewport(map, b, { maxZoom: 12, duration: 1000, paddingBase: 60 });
    }
  }, [geojson, getBounds]);

  const fitRef = useRef(fitToDataBounds);
  const prepareRef = useRef(prepareColoredGeoJSON);
  useEffect(() => {
    fitRef.current = fitToDataBounds;
    prepareRef.current = prepareColoredGeoJSON;
  });

  // 僅在「幾何邊界」改變（例如切換資料集）時才重新對焦；
  // 調整色盤 / 分級數 / 時間軸 / 指標時不應重置使用者目前的視角。
  const boundsKey = useMemo(() => JSON.stringify(getBounds(geojson)), [geojson, getBounds]);

  // 從排行榜 / 圖表 / 資料表選取區域時，自動將地圖定位到該區域（由地圖點擊觸發的選取則不移動視角）
  const selfSelectedRef = useRef<string | null>(null);
  const geojsonRef = useRef(geojson);
  useEffect(() => {
    geojsonRef.current = geojson;
  });
  useEffect(() => {
    const map = mapRef.current;
    const fromMap = selfSelectedRef.current;
    selfSelectedRef.current = null;
    if (!map || selectedRegionId === null || fromMap === String(selectedRegionId)) return;

    const feat = geojsonRef.current.features.find(
      (f, i) => String(f.properties?._idKey ?? i) === String(selectedRegionId)
    );
    if (!feat) return;
    const b = getBounds({ type: 'FeatureCollection', features: [feat] } as CustomFeatureCollection);
    if (!b) return;
    applyDataViewport(map, b, { maxZoom: 9, duration: 800, paddingBase: 80 });
  }, [selectedRegionId, getBounds]);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: createRasterStyle(appliedBasemapRef.current),
      center: [120.9605, 23.6978], // Default Taiwan
      zoom: 6.5,
      // 保留預設 true：拖曳可無縫環繞地球；破版來自 360° fitBounds，非此選項
      renderWorldCopies: true,
      attributionControl: {
        compact: false,
      },
    });

    mapRef.current = map;

    popupRef.current = new Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      maxWidth: '320px',
    });

    map.on('load', () => {
      addChoroplethLayers(map, prepareRef.current());

      // Hover / Selection events
      map.on('mousemove', 'choropleth-fill', (e: any) => {
        if (!e.features || e.features.length === 0) return;
        map.getCanvas().style.cursor = 'pointer';
        const feat = e.features[0];
        const props = feat.properties;

        if (popupRef.current) {
          const hasValue =
            props._matched &&
            props._metricValue !== null &&
            props._metricValue !== undefined &&
            props._metricValue !== 'null';
          const valText = hasValue
            ? `<span class="font-bold text-sky-700 dark:text-sky-400 text-lg">${escapeHtml(
                formatNumber(Number(props._metricValue))
              )}</span>`
            : `<span class="text-amber-700 dark:text-amber-400 italic">無此指標資料 (未匹配)</span>`;

          const hasRank = props._rank !== undefined && props._rank !== null && props._rank !== 'null' && props._rank !== '';
          const rankText = hasRank
            ? `<div class="text-xs text-slate-600 dark:text-slate-300 mt-1">排名: <span class="font-semibold text-slate-900 dark:text-white">#${escapeHtml(
                props._rank
              )}</span> / ${escapeHtml(props._rankTotal)} (前 ${escapeHtml(props._percentile)}%)</div>`
            : '';

          const html = `
            <div class="p-1 leading-snug">
              <div class="font-bold text-sm text-slate-900 dark:text-white">${escapeHtml(props._regionName)}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-mono">代碼: ${escapeHtml(props._joinKey || 'N/A')}</div>
              <div class="text-xs text-slate-600 dark:text-slate-300 mb-1 break-all">${escapeHtml(metricColumnRef.current)}:</div>
              <div>${valText}</div>
              ${rankText}
            </div>
          `;

          popupRef.current.setLngLat(e.lngLat).setHTML(html).addTo(map);
        }
      });

      map.on('mouseleave', 'choropleth-fill', () => {
        map.getCanvas().style.cursor = '';
        if (popupRef.current) {
          popupRef.current.remove();
        }
      });

      map.on('click', (e: any) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['choropleth-fill'] });
        if (features.length === 0) {
          onSelectRegionRef.current(null);
        } else {
          const id = String(features[0].properties._idKey);
          selfSelectedRef.current = id;
          onSelectRegionRef.current(id);
        }
      });

      fitRef.current();
      onMapReadyRef.current?.(map);
    });

    return () => {
      if (popupRef.current) popupRef.current.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []); // Run once on mount

  // 面板 / 視窗尺寸變更時同步 MapLibre canvas，避免圖磚錯位或重複
  useEffect(() => {
    const container = mapContainerRef.current;
    const map = mapRef.current;
    if (!container || !map || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Update basemap when selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedBasemapRef.current === basemap) return;
    appliedBasemapRef.current = basemap;
    // setStyle 會清除自訂圖層；以 diff:false 確保一定會觸發 style.load，再重新加入分級設色圖層
    map.once('style.load', () => {
      addChoroplethLayers(map, prepareRef.current());
    });
    map.setStyle(createRasterStyle(basemap), { diff: false });
  }, [basemap]);

  // Update GeoJSON source whenever data, breaks, or filters change.
  // 注意：不可用 map.isStyleLoaded() 擋住更新（底圖圖磚載入中會回傳 false，導致篩選 / 選取更新被丟棄）。
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (source) {
      source.setData(prepareColoredGeoJSON());
    }
  }, [prepareColoredGeoJSON]);

  // Auto zoom to data bounds only when the geometry extent changes (dataset switch)
  useEffect(() => {
    fitRef.current();
  }, [boundsKey]);

  return (
    <div ref={wrapperRef} className="relative w-full h-full flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden">
      {/* MapLibre DOM Node */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 僅保留底圖切換（圖示）；縮放／截圖／全螢幕改由頂欄匯出與滑鼠滾輪操作，避免地圖側欄破版 */}
      <div
        data-testid="map-controls-container"
        className="absolute top-3 right-3 lg:right-auto lg:top-[max(11rem,calc(50%_-_6.5rem))] lg:left-3 z-20"
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowBasemapMenu(!showBasemapMenu)}
            title="切換底圖來源"
            aria-label="切換底圖來源"
            className="p-2.5 bg-white/95 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-md dark:shadow-lg backdrop-blur-xs transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-slate-700 dark:text-sky-400" />
          </button>

          {showBasemapMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                aria-hidden="true"
                onClick={() => setShowBasemapMenu(false)}
              />
              <div className="absolute right-0 lg:left-0 mt-1.5 w-52 bg-white/98 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2 z-40 backdrop-blur-xs text-xs space-y-1 max-w-[calc(100vw-24px)]">
                <div className="px-2 py-1.5 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 mb-1">
                  公開合法地圖來源
                </div>
                {(Object.keys(BASEMAP_CONFIGS) as BasemapStyle[]).map((styleKey) => {
                  const conf = BASEMAP_CONFIGS[styleKey];
                  const active = basemap === styleKey;
                  return (
                    <button
                      key={styleKey}
                      type="button"
                      onClick={() => {
                        userSelectedBasemapRef.current = true;
                        setBasemap(styleKey);
                        setShowBasemapMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        active
                          ? 'bg-slate-100 dark:bg-sky-500/20 text-slate-900 dark:text-sky-300 font-semibold border border-slate-300 dark:border-sky-500/30'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="min-w-0 truncate pr-1">{conf.name}</span>
                      <span
                        className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600 shrink-0"
                        style={{ backgroundColor: conf.thumbnail }}
                      />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
