import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Map as MapLibreMap, Popup, GeoJSONSource } from 'maplibre-gl';
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
  const userSelectedBasemapRef = useRef<boolean>(false);
  const [basemap, setBasemap] = useState<BasemapStyle>(
    resolvedTheme === 'dark' ? 'carto-dark' : 'carto-positron'
  );
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
      const featureId = feature.id ?? props.id ?? props.COUNTYCODE ?? props.iso3 ?? idx;

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
      props._strokeWidth = featureId === selectedRegionId ? 3.5 : 1.2;
      props._strokeColor =
        featureId === selectedRegionId
          ? '#fbbf24' // gold for selected
          : passesFilter
          ? '#e2e8f0'
          : '#475569';
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
  }, [geojson, breaks, selectedBreakIndex, searchFilter, rangeFilter, selectedRegionId]);

  // Fit bounds to current dataset
  const fitToDataBounds = useCallback(() => {
    if (!mapRef.current) return;
    const b = getBounds(geojson);
    if (b) {
      mapRef.current.fitBounds(b, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 12,
        duration: 1000,
      });
    }
  }, [geojson, getBounds]);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: createRasterStyle(basemap),
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
    });

    map.on('load', () => {
      // Add choropleth source
      map.addSource('choropleth-source', {
        type: 'geojson',
        data: prepareColoredGeoJSON(),
      });

      // Fill layer
      map.addLayer({
        id: 'choropleth-fill',
        type: 'fill',
        source: 'choropleth-source',
        paint: {
          'fill-color': ['get', '_displayColor'],
          'fill-opacity': ['get', '_opacity'],
        },
      });

      // Stroke layer
      map.addLayer({
        id: 'choropleth-stroke',
        type: 'line',
        source: 'choropleth-source',
        paint: {
          'line-color': ['get', '_strokeColor'],
          'line-width': ['get', '_strokeWidth'],
          'line-opacity': 0.9,
        },
      });

      // Hover / Selection events
      map.on('mousemove', 'choropleth-fill', (e: any) => {
        if (!e.features || e.features.length === 0) return;
        map.getCanvas().style.cursor = 'pointer';
        const feat = e.features[0];
        const props = feat.properties;

        if (popupRef.current) {
          const valText =
            props._matched && props._metricValue !== null && props._metricValue !== undefined
              ? `<span class="font-bold text-sky-400 text-lg">${formatNumber(
                  Number(props._metricValue)
                )}</span>`
              : `<span class="text-amber-400 italic">無此指標資料 (未匹配)</span>`;

          const rankText =
            props._rank
              ? `<div class="text-xs text-slate-300 mt-1">排名: <span class="font-semibold text-white">#${props._rank}</span> / ${props._rankTotal} (前 ${props._percentile}%)</div>`
              : '';

          const html = `
            <div class="p-1 leading-snug">
              <div class="font-bold text-sm text-white">${props._regionName}</div>
              <div class="text-xs text-slate-400 mb-1.5 font-mono">代碼: ${props._joinKey || 'N/A'}</div>
              <div class="text-xs text-slate-300 mb-1">${metricColumn}:</div>
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

      map.on('click', 'choropleth-fill', (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0];
        const idKey = feat.properties._idKey;
        onSelectRegion(idKey);
      });

      map.on('click', (e: any) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['choropleth-fill'] });
        if (features.length === 0) {
          onSelectRegion(null);
        }
      });

      fitToDataBounds();
      onMapReady?.(map);
    });

    return () => {
      if (popupRef.current) popupRef.current.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []); // Run once on mount

  // Update basemap when selection changes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (map.isStyleLoaded()) {
      map.setStyle(createRasterStyle(basemap));
      map.once('style.load', () => {
        // Re-add layers after style load
        if (!map.getSource('choropleth-source')) {
          map.addSource('choropleth-source', {
            type: 'geojson',
            data: prepareColoredGeoJSON(),
          });
          map.addLayer({
            id: 'choropleth-fill',
            type: 'fill',
            source: 'choropleth-source',
            paint: {
              'fill-color': ['get', '_displayColor'],
              'fill-opacity': ['get', '_opacity'],
            },
          });
          map.addLayer({
            id: 'choropleth-stroke',
            type: 'line',
            source: 'choropleth-source',
            paint: {
              'line-color': ['get', '_strokeColor'],
              'line-width': ['get', '_strokeWidth'],
              'line-opacity': 0.9,
            },
          });
        }
      });
    }
  }, [basemap]);

  // Update GeoJSON source whenever data, breaks, or filters change
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (map.isStyleLoaded()) {
      const source = map.getSource('choropleth-source') as GeoJSONSource;
      if (source) {
        source.setData(prepareColoredGeoJSON());
      }
    }
  }, [prepareColoredGeoJSON]);

  // Auto zoom to data bounds when GeoJSON dataset changes significantly
  useEffect(() => {
    fitToDataBounds();
  }, [geojson, fitToDataBounds]);

  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!isFullscreen) {
      if (mapContainerRef.current.requestFullscreen) {
        mapContainerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden">
      {/* MapLibre DOM Node */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Control Buttons (Positioned below filter bar with zero overlap) */}
      <div data-testid="map-controls-container" className="absolute top-3 right-3 lg:top-24 lg:left-3 flex flex-col gap-2 z-20">
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
