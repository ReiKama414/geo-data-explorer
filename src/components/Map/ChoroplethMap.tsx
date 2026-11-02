import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Map as MapLibreMap, Popup, GeoJSONSource, setWorkerUrl } from 'maplibre-gl';
// MapLibre v6 以 import.meta.url 推導 worker 檔案位置；經 Vite 打包後該路徑不存在，
// 會導致 "Worker failed to load" 且地圖 / 多邊形完全不顯示，必須明確指定 worker URL。
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Camera,
  RotateCcw,
} from 'lucide-react';
import type {
  CustomFeatureCollection,
  BasemapStyle,
  LegendBreak,
} from '../../types';
import type { ResolvedTheme } from '../../services/theme';
import { BASEMAP_CONFIGS, createRasterStyle } from '../../utils/basemaps';
import { getColorForValue, formatNumber } from '../../utils/colorScales';
import { exportMapImage } from '../../utils/exportUtils';

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
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      // 在小螢幕 / 低高度視窗上縮減 padding，避免 padding 大於容器導致 fitBounds 失敗
      map.fitBounds(b, {
        padding: getFitPadding(map, 60),
        maxZoom: 12,
        duration: 1000,
      });
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
    map.fitBounds(b, {
      padding: getFitPadding(map, 80),
      maxZoom: 9,
      duration: 800,
    });
  }, [selectedRegionId, getBounds]);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: createRasterStyle(appliedBasemapRef.current),
      center: [120.9605, 23.6978], // Default Taiwan
      zoom: 6.5,
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

  // Keep fullscreen state in sync (e.g. user presses Esc)
  const getFullscreenTarget = () => wrapperRef.current?.parentElement ?? wrapperRef.current;
  useEffect(() => {
    const onChange = () => {
      const target = wrapperRef.current?.parentElement ?? wrapperRef.current;
      setIsFullscreen(!!target && document.fullscreenElement === target);
      mapRef.current?.resize();
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      // 對整個地圖工作區（含篩選列 / 圖例 / 面板）進入全螢幕，而非只有地圖畫布
      getFullscreenTarget()?.requestFullscreen?.().catch(() => {});
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full h-full flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden">
      {/* MapLibre DOM Node */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Control Buttons (Positioned below filter bar with zero overlap) */}
      <div data-testid="map-controls-container" className="absolute top-3 right-3 lg:right-auto lg:top-[max(11rem,calc(50%_-_6.5rem))] lg:left-3 flex flex-col gap-2 z-20">
        {/* Basemap Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowBasemapMenu(!showBasemapMenu)}
            title="切換底圖來源"
            className="p-2.5 bg-white/95 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-md dark:shadow-lg backdrop-blur-xs transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          >
            <Layers className="w-4 h-4 text-slate-700 dark:text-sky-400" />
            <span className="hidden sm:inline">底圖風格</span>
          </button>

          {showBasemapMenu && (
            <div className="absolute right-0 lg:left-0 mt-1.5 w-52 bg-white/98 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2 z-30 backdrop-blur-xs text-xs space-y-1 max-w-[calc(100vw-24px)]">
              <div className="px-2 py-1 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 mb-1">
                公開合法地圖來源
              </div>
              {(Object.keys(BASEMAP_CONFIGS) as BasemapStyle[]).map((styleKey) => {
                const conf = BASEMAP_CONFIGS[styleKey];
                const active = basemap === styleKey;
                return (
                  <button
                    key={styleKey}
                    onClick={() => {
                      userSelectedBasemapRef.current = true;
                      setBasemap(styleKey);
                      setShowBasemapMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-100 dark:bg-sky-500/20 text-slate-900 dark:text-sky-300 font-semibold border border-slate-300 dark:border-sky-500/30'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{conf.name}</span>
                    <span
                      className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600"
                      style={{ backgroundColor: conf.thumbnail }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Zoom & Fit Controls */}
        <div className="flex flex-col bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-md dark:shadow-lg backdrop-blur-xs overflow-hidden">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            title="放大地圖"
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            title="縮小地圖"
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={fitToDataBounds}
            title="重設視角至資料範圍"
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </button>
        </div>

        {/* Snapshot & Fullscreen Controls */}
        <div className="flex flex-col bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-md dark:shadow-lg backdrop-blur-xs overflow-hidden">
          <button
            onClick={() => exportMapImage(mapRef.current)}
            title="匯出地圖截圖 (PNG)"
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </button>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? '離開全螢幕' : '全螢幕檢視'}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
