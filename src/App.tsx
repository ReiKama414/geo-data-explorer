import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { X } from 'lucide-react';
import type {
  CustomFeatureCollection,
  CsvDataset,
  MergeConfig,
  ClassificationMethod,
  PaletteId,
} from './types';
import { performDataMerge } from './utils/dataMerge';
import {
  saveActiveSession,
  loadActiveSession,
  type WorkspaceSession,
} from './services/storage';
import { useTheme } from './services/theme';
import { exportMapImage } from './utils/exportUtils';
import { Header } from './components/Header/Header';
import { ChoroplethMap } from './components/Map/ChoroplethMap';
import { Legend } from './components/Legend/Legend';
import { TimeSlider } from './components/Timeline/TimeSlider';
import { FilterBar } from './components/Filters/FilterBar';
import { Leaderboard } from './components/Ranking/Leaderboard';
import { EChartsAnalytics } from './components/Charts/EChartsAnalytics';
import { DataTableModal } from './components/Table/DataTableModal';
import { ImportModal } from './components/Import/ImportModal';
import { ProjectManagerModal } from './components/Project/ProjectManagerModal';
import { UnmatchedBanner, UnmatchedMapperModal } from './components/Unmatched/UnmatchedMapperModal';
import { RegionDetailCard } from './components/Map/RegionDetailCard';

async function parseJsonResponse(res: Response) {
  if (!res.ok) throw new Error(`無法載入資料 (${res.status} ${res.url})`);
  return res.json();
}

async function parseTextResponse(res: Response) {
  if (!res.ok) throw new Error(`無法載入資料 (${res.status} ${res.url})`);
  return res.text();
}

export function App() {
  // Theme hook
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Core Data States
  const [datasetTitle, setDatasetTitle] = useState<string>('台灣各縣市發展指標');
  const [geoJsonData, setGeoJsonData] = useState<CustomFeatureCollection | null>(null);
  const [csvData, setCsvData] = useState<CsvDataset | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Map instance ref for snapshot export
  const mapInstanceRef = useRef<MapLibreMap | null>(null);

  // Merge Configuration State
  const [mergeConfig, setMergeConfig] = useState<MergeConfig>({
    geoKey: 'COUNTYCODE',
    csvKey: 'county_code',
    timeColumn: 'year',
    selectedTime: '2024',
    metricColumn: 'median_income_thousand_twd',
    aliasMap: {},
  });

  // Visualization Style State
  const [classificationMethod, setClassificationMethod] = useState<ClassificationMethod>('jenks');
  const [paletteId, setPaletteId] = useState<PaletteId>('viridis');
  const [paletteReversed, setPaletteReversed] = useState<boolean>(false);
  const [numClasses, setNumClasses] = useState<number>(5);

  // Filters & Interaction State
  const [selectedRegionId, setSelectedRegionId] = useState<string | number | null>(null);
  const [selectedBreakIndex, setSelectedBreakIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rangeFilter, setRangeFilter] = useState<[number, number] | null>(null);
  const [activeSidePanel, setActiveSidePanel] = useState<'echarts' | 'ranking' | 'inspector'>('echarts');
  const [mobileSidePanelOpen, setMobileSidePanelOpen] = useState<boolean>(false);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState<boolean>(false);
  const [isUnmatchedModalOpen, setIsUnmatchedModalOpen] = useState<boolean>(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);

  // Load Preset Function
  const loadPreset = useCallback(async (presetId: 'taiwan' | 'world' | 'us') => {
    setIsLoading(true);
    setLoadError(null);
    setSelectedRegionId(null);
    setSelectedBreakIndex(null);
    setSearchQuery('');
    setRangeFilter(null);

    try {
      if (presetId === 'taiwan') {
        const [geoRes, csvRes] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}presets/taiwan-counties.geojson`).then(parseJsonResponse),
          fetch(`${import.meta.env.BASE_URL}presets/taiwan-metrics.csv`).then(parseTextResponse),
        ]);
        const parsedCsv = Papa.parse<Record<string, any>>(csvRes, {
          header: true,
          skipEmptyLines: true,
        });

        const csvObj: CsvDataset = {
          fileName: 'taiwan-metrics.csv',
          headers: parsedCsv.meta.fields || [],
          rows: parsedCsv.data,
          totalRows: parsedCsv.data.length,
        };

        setGeoJsonData(geoRes);
        setCsvData(csvObj);
        setDatasetTitle('台灣各縣市發展指標 (2020-2024)');
        setMergeConfig({
          geoKey: 'COUNTYCODE',
          csvKey: 'county_code',
          timeColumn: 'year',
          selectedTime: '2024',
          metricColumn: 'median_income_thousand_twd',
          aliasMap: {},
        });
        setClassificationMethod('jenks');
        setPaletteId('viridis');
      } else if (presetId === 'world') {
        const [geoRes, csvRes] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}presets/world-countries.geojson`).then(parseJsonResponse),
          fetch(`${import.meta.env.BASE_URL}presets/world-metrics.csv`).then(parseTextResponse),
        ]);
        const parsedCsv = Papa.parse<Record<string, any>>(csvRes, {
          header: true,
          skipEmptyLines: true,
        });

        const csvObj: CsvDataset = {
          fileName: 'world-metrics.csv',
          headers: parsedCsv.meta.fields || [],
          rows: parsedCsv.data,
          totalRows: parsedCsv.data.length,
        };

        setGeoJsonData(geoRes);
        setCsvData(csvObj);
        setDatasetTitle('全球各國發展指標 (2020-2024)');
        setMergeConfig({
          geoKey: 'iso3',
          csvKey: 'country_code',
          timeColumn: 'year',
          selectedTime: '2024',
          metricColumn: 'gdp_per_capita_usd',
          aliasMap: {},
        });
        setClassificationMethod('logarithmic');
        setPaletteId('plasma');
      } else if (presetId === 'us') {
        const [geoRes, csvRes] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}presets/us-states.geojson`).then(parseJsonResponse),
          fetch(`${import.meta.env.BASE_URL}presets/us-states-metrics.csv`).then(parseTextResponse),
        ]);
        const parsedCsv = Papa.parse<Record<string, any>>(csvRes, {
          header: true,
          skipEmptyLines: true,
        });

        const csvObj: CsvDataset = {
          fileName: 'us-states-metrics.csv',
          headers: parsedCsv.meta.fields || [],
          rows: parsedCsv.data,
          totalRows: parsedCsv.data.length,
        };

        setGeoJsonData(geoRes);
        setCsvData(csvObj);
        setDatasetTitle('美國各州經濟與綠能 (2021-2024)');
        setMergeConfig({
          geoKey: 'state_code',
          csvKey: 'state_code',
          timeColumn: 'year',
          selectedTime: '2024',
          metricColumn: 'ev_adoption_pct',
          aliasMap: {},
        });
        setClassificationMethod('quantile');
        setPaletteId('blues');
      }
    } catch (err) {
      console.error('Failed to load preset:', err);
      setLoadError(err instanceof Error ? err.message : '未知錯誤');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial Load with IndexedDB Auto-Recovery
  useEffect(() => {
    let isCancelled = false;
    const initialize = async () => {
      try {
        const saved = await loadActiveSession();
        if (!isCancelled && saved && saved.geojson && saved.csv) {
          setGeoJsonData(saved.geojson);
          setCsvData(saved.csv);
          setDatasetTitle(saved.datasetTitle || '還原自 IndexedDB 工作區');
          setMergeConfig(saved.mergeConfig);
          setClassificationMethod(saved.classificationMethod || 'jenks');
          setPaletteId(saved.paletteId || 'viridis');
          setPaletteReversed(saved.paletteReversed || false);
          setNumClasses(saved.numClasses || 5);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Could not restore from IndexedDB:', err);
      }
      if (!isCancelled) {
        loadPreset('taiwan');
      }
    };

    initialize();
    return () => {
      isCancelled = true;
    };
  }, [loadPreset]);

  // Current Workspace Session for Persistence
  const currentSession: WorkspaceSession = useMemo(() => {
    return {
      datasetTitle,
      geojson: geoJsonData || { type: 'FeatureCollection', features: [] },
      csv: csvData || { fileName: '', headers: [], rows: [], totalRows: 0 },
      mergeConfig,
      classificationMethod,
      paletteId,
      paletteReversed,
      numClasses,
      updatedAt: Date.now(),
    };
  }, [
    datasetTitle,
    geoJsonData,
    csvData,
    mergeConfig,
    classificationMethod,
    paletteId,
    paletteReversed,
    numClasses,
  ]);

  // Debounced Auto-Save to IndexedDB
  useEffect(() => {
    if (!geoJsonData || !csvData || isLoading) return;

    const timer = setTimeout(() => {
      saveActiveSession(currentSession);
    }, 1200);

    return () => clearTimeout(timer);
  }, [currentSession, geoJsonData, csvData, isLoading]);

  // Execute Merge when Data or Merge Config changes
  const mergeResult = useMemo(() => {
    if (!geoJsonData || !csvData) return null;
    return performDataMerge(
      geoJsonData,
      csvData,
      mergeConfig,
      classificationMethod,
      paletteId,
      paletteReversed,
      numClasses
    );
  }, [
    geoJsonData,
    csvData,
    mergeConfig,
    classificationMethod,
    paletteId,
    paletteReversed,
    numClasses,
  ]);

  // Selected Feature for Region Detail Card
  const selectedFeature = useMemo(() => {
    if (!mergeResult || selectedRegionId === null) return null;
    return (
      mergeResult.mergedGeoJSON.features.find((f, idx) => {
        const idKey = f.properties?._idKey ?? idx;
        return String(idKey) === String(selectedRegionId);
      }) || null
    );
  }, [mergeResult, selectedRegionId]);

  // 若選取的區域不存在（例如切換資料集後），不可停留在「區域詳情」分頁
  const sidePanel: 'echarts' | 'ranking' | 'inspector' =
    activeSidePanel === 'inspector' && !selectedFeature ? 'echarts' : activeSidePanel;

  // 從排行榜 / 圖表選取：只更新選取狀態（地圖會自動定位），不切換分頁，
  // 否則點選一列後清單會立刻被「區域詳情」取代，無法連續瀏覽其他區域。
  const handleSelectFromPanel = useCallback((id: string | number | null) => {
    setSelectedRegionId(id);
  }, []);

  // 桌面右側面板需避開底部圖例：量測圖例高度，預留對應空間
  const [legendEl, setLegendEl] = useState<HTMLDivElement | null>(null);
  const [legendReserve, setLegendReserve] = useState<number>(140);
  useEffect(() => {
    if (!legendEl || typeof ResizeObserver === 'undefined') return;
    const update = () => setLegendReserve(legendEl.offsetHeight + 24 + 12);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(legendEl);
    return () => ro.disconnect();
  }, [legendEl]);

  // 從資料總表「定位」時一併切到區域詳情
  const handleSelectFromTable = useCallback((id: string | number | null) => {
    setSelectedRegionId(id);
    if (id !== null) setActiveSidePanel('inspector');
  }, []);

  // Handler for region selection
  const handleSelectRegion = useCallback((id: string | number | null) => {
    setSelectedRegionId(id);
    if (id !== null) {
      setActiveSidePanel('inspector');
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setMobileSidePanelOpen(true);
      }
    } else {
      setActiveSidePanel((prev) => (prev === 'inspector' ? 'echarts' : prev));
    }
  }, []);

  // Alias Mapping Update Handlers
  const handleUpdateAlias = (csvKeyVal: string, targetGeoKeyVal: string) => {
    setMergeConfig((prev) => ({
      ...prev,
      aliasMap: {
        ...prev.aliasMap,
        [csvKeyVal]: targetGeoKeyVal,
      },
    }));
  };

  const handleRemoveAlias = (csvKeyVal: string) => {
    setMergeConfig((prev) => {
      const nextMap = { ...prev.aliasMap };
      delete nextMap[csvKeyVal];
      return {
        ...prev,
        aliasMap: nextMap,
      };
    });
  };

  // Restore session from Project Manager Modal
  const handleRestoreSession = (session: WorkspaceSession) => {
    setGeoJsonData(session.geojson);
    setCsvData(session.csv);
    setDatasetTitle(session.datasetTitle);
    setMergeConfig(session.mergeConfig);
    setClassificationMethod(session.classificationMethod);
    setPaletteId(session.paletteId);
    setPaletteReversed(session.paletteReversed);
    setNumClasses(session.numClasses);
    setSelectedRegionId(null);
    setSelectedBreakIndex(null);
    setSearchQuery('');
    setRangeFilter(null);
  };

  // Custom Dataset Apply Handler
  const handleApplyCustomDataset = (
    geojson: CustomFeatureCollection,
    csv: CsvDataset,
    config: MergeConfig,
    title: string
  ) => {
    setGeoJsonData(geojson);
    setCsvData(csv);
    setMergeConfig(config);
    setDatasetTitle(title);
    setSelectedRegionId(null);
    setSelectedBreakIndex(null);
    setSearchQuery('');
    setRangeFilter(null);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Header Navigation Bar */}
      <Header
        datasetTitle={datasetTitle}
        matchedCount={mergeResult?.matchedCount ?? 0}
        totalGeoCount={mergeResult?.totalGeoFeatures ?? 0}
        unmatchedCsvCount={mergeResult?.unmatchedCsvRows.length ?? 0}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenTable={() => setIsTableModalOpen(true)}
        onOpenUnmatched={() => setIsUnmatchedModalOpen(true)}
        onOpenProjectManager={() => setIsProjectModalOpen(true)}
        onOpenAnalytics={() => setMobileSidePanelOpen(true)}
        geojson={mergeResult?.mergedGeoJSON ?? { type: 'FeatureCollection', features: [] }}
        onLoadPreset={loadPreset}
        onExportPng={() => exportMapImage(mapInstanceRef.current)}
        theme={theme}
        resolvedTheme={resolvedTheme}
        onSetTheme={setTheme}
      />

      {/* 2. Main Geospatial Workspace */}
      <div className="relative flex-1 w-full h-full overflow-hidden min-w-0">
        {loadError && !isLoading ? (
          <div
            data-testid="load-error"
            className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-300 gap-3 p-4 text-center"
          >
            <p className="font-semibold text-sm text-rose-600 dark:text-rose-400">資料載入失敗</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 break-all max-w-md">{loadError}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => loadPreset('taiwan')}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white dark:bg-sky-600 dark:hover:bg-sky-500 text-xs font-medium cursor-pointer"
              >
                重新載入範例資料
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
              >
                匯入自己的資料
              </button>
            </div>
          </div>
        ) : isLoading || !mergeResult ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 gap-2 p-4 text-center">
            <div className="w-8 h-8 border-3 border-slate-300 dark:border-sky-500/20 border-t-slate-800 dark:border-t-sky-400 rounded-full animate-spin" />
            <p className="font-semibold text-xs">載入地理向量圖資與計算分級設色中...</p>
          </div>
        ) : (
          <>
            {/* MapLibre Canvas */}
            <ChoroplethMap
              geojson={mergeResult.mergedGeoJSON}
              breaks={mergeResult.currentBreaks}
              metricColumn={mergeConfig.metricColumn}
              selectedRegionId={selectedRegionId}
              onSelectRegion={handleSelectRegion}
              selectedBreakIndex={selectedBreakIndex}
              searchFilter={searchQuery}
              rangeFilter={rangeFilter}
              resolvedTheme={resolvedTheme}
              onMapReady={(map) => {
                mapInstanceRef.current = map;
              }}
            />

            {/* Floating Top Filter Bar & Unmatched Warning */}
            <div className="absolute top-3 left-3 right-16 md:right-auto md:w-[620px] z-10 space-y-2 pointer-events-auto max-w-[calc(100vw-24px)]">
              <FilterBar
                metricColumns={mergeResult.allMetricColumns}
                selectedMetric={mergeConfig.metricColumn}
                onSelectMetric={(m) => {
                  setMergeConfig((prev) => ({ ...prev, metricColumn: m }));
                  setSelectedBreakIndex(null);
                  setRangeFilter(null);
                }}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                rangeFilter={rangeFilter}
                onRangeFilterChange={setRangeFilter}
                stats={mergeResult.activeStats}
              />

              {mergeResult.unmatchedCsvRows.length > 0 && (
                <UnmatchedBanner
                  unmatchedCount={mergeResult.unmatchedCsvRows.length}
                  onOpenModal={() => setIsUnmatchedModalOpen(true)}
                />
              )}
            </div>

            {/* Floating Desktop Right Dock: ECharts Analytics, Ranking and Region Inspector */}
            <div
              data-testid="desktop-right-dock"
              /* 底部保留圖例高度，避免右側面板蓋住圖例（面板會在剩餘高度內自動縮放） */
              style={{ bottom: legendReserve }}
              className="hidden lg:flex absolute top-16 right-3 z-10 flex-col items-end gap-2 pointer-events-none max-w-[calc(100vw-24px)]"
            >
              {/* Tab selector */}
              <div className="pointer-events-auto shrink-0 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 flex gap-0.5 shadow-md text-[11px] backdrop-blur-xs transition-colors">
                {selectedFeature && (
                  <button
                    onClick={() => setActiveSidePanel('inspector')}
                    className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors flex items-center gap-1 ${
                      sidePanel === 'inspector'
                        ? 'bg-slate-900 dark:bg-sky-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>📍 區域詳情</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveSidePanel('echarts')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                    sidePanel === 'echarts'
                      ? 'bg-slate-900 dark:bg-sky-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  ECharts 分析圖
                </button>
                <button
                  onClick={() => setActiveSidePanel('ranking')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                    sidePanel === 'ranking'
                      ? 'bg-slate-900 dark:bg-sky-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  排行清單
                </button>
              </div>

              <div className="pointer-events-auto min-h-0 flex flex-col items-end max-w-full">
                {sidePanel === 'inspector' && selectedFeature ? (
                  <RegionDetailCard
                    feature={selectedFeature}
                    metricColumn={mergeConfig.metricColumn}
                    onClose={() => {
                      setSelectedRegionId(null);
                      setActiveSidePanel('echarts');
                    }}
                  />
                ) : sidePanel === 'echarts' ? (
                  <EChartsAnalytics
                    geojson={mergeResult.mergedGeoJSON}
                    csv={csvData}
                    metricColumn={mergeConfig.metricColumn}
                    timeColumn={mergeConfig.timeColumn}
                    selectedTime={mergeConfig.selectedTime}
                    timeValues={mergeResult.timeValues}
                    breaks={mergeResult.currentBreaks}
                    stats={mergeResult.activeStats}
                    selectedRegionId={selectedRegionId}
                    onSelectRegion={handleSelectFromPanel}
                    theme={resolvedTheme}
                  />
                ) : (
                  <Leaderboard
                    geojson={mergeResult.mergedGeoJSON}
                    metricColumn={mergeConfig.metricColumn}
                    stats={mergeResult.activeStats}
                    selectedRegionId={selectedRegionId}
                    onSelectRegion={handleSelectFromPanel}
                  />
                )}
              </div>
            </div>

            {/* Mobile Modal Drawer for Analytics & Inspector */}
            {mobileSidePanelOpen && (
              <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col justify-end p-2 sm:p-4">
                <div
                  data-testid="mobile-analytics-modal"
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 max-h-[85vh] flex flex-col overflow-hidden max-w-[calc(100vw-16px)] mx-auto w-full"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span data-testid="mobile-analytics-title" className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        資料統計與排行
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {selectedFeature && (
                          <button
                            onClick={() => setActiveSidePanel('inspector')}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                              sidePanel === 'inspector'
                                ? 'bg-slate-900 dark:bg-sky-600 text-white'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            詳情
                          </button>
                        )}
                        <button
                          data-testid="mobile-tab-echarts"
                          onClick={() => setActiveSidePanel('echarts')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                            sidePanel === 'echarts'
                              ? 'bg-slate-900 dark:bg-sky-600 text-white'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          圖表
                        </button>
                        <button
                          data-testid="mobile-tab-ranking"
                          onClick={() => setActiveSidePanel('ranking')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                            sidePanel === 'ranking'
                              ? 'bg-slate-900 dark:bg-sky-600 text-white'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          排行
                        </button>
                      </div>
                    </div>
                    <button
                      data-testid="close-mobile-analytics"
                      aria-label="關閉統計圖表"
                      onClick={() => setMobileSidePanelOpen(false)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
                    {sidePanel === 'inspector' && selectedFeature ? (
                      <RegionDetailCard
                        feature={selectedFeature}
                        metricColumn={mergeConfig.metricColumn}
                        onClose={() => {
                          setSelectedRegionId(null);
                          setActiveSidePanel('echarts');
                        }}
                      />
                    ) : sidePanel === 'echarts' ? (
                      <EChartsAnalytics
                        geojson={mergeResult.mergedGeoJSON}
                        csv={csvData}
                        metricColumn={mergeConfig.metricColumn}
                        timeColumn={mergeConfig.timeColumn}
                        selectedTime={mergeConfig.selectedTime}
                        timeValues={mergeResult.timeValues}
                        breaks={mergeResult.currentBreaks}
                        stats={mergeResult.activeStats}
                        selectedRegionId={selectedRegionId}
                        onSelectRegion={handleSelectRegion}
                        theme={resolvedTheme}
                      />
                    ) : (
                      <Leaderboard
                        geojson={mergeResult.mergedGeoJSON}
                        metricColumn={mergeConfig.metricColumn}
                        stats={mergeResult.activeStats}
                        selectedRegionId={selectedRegionId}
                        onSelectRegion={handleSelectRegion}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Geospatial Controls: Stacked on mobile via flexbox for zero collision, independent on desktop */}
            <div className="absolute bottom-10 left-3 right-3 sm:bottom-auto sm:left-auto sm:right-auto sm:contents z-10 pointer-events-none flex flex-col items-stretch sm:items-end gap-2">
              {/* Interactive Legend & Classification */}
              <div ref={setLegendEl} className="w-full sm:w-72 sm:absolute sm:bottom-6 sm:right-3 max-w-[calc(100vw-24px)] pointer-events-auto">
                <Legend
                  breaks={mergeResult.currentBreaks}
                  metricName={mergeConfig.metricColumn}
                  classificationMethod={classificationMethod}
                  onChangeMethod={setClassificationMethod}
                  paletteId={paletteId}
                  onChangePalette={setPaletteId}
                  paletteReversed={paletteReversed}
                  onToggleReversePalette={() => setPaletteReversed(!paletteReversed)}
                  numClasses={numClasses}
                  onChangeNumClasses={setNumClasses}
                  selectedBreakIndex={selectedBreakIndex}
                  onSelectBreak={setSelectedBreakIndex}
                  unmatchedCount={mergeResult.unmatchedGeoFeatures.length}
                />
              </div>

              {/* Multi-Period Time Slider */}
              {mergeResult.timeValues.length > 1 && (
                <div className="w-full sm:w-96 sm:absolute sm:bottom-6 sm:left-3 max-w-[calc(100vw-24px)] pointer-events-auto">
                  <TimeSlider
                    timeValues={mergeResult.timeValues}
                    selectedTime={mergeConfig.selectedTime}
                    onTimeChange={(t) => setMergeConfig((prev) => ({ ...prev, selectedTime: t }))}
                    timeColumnName={mergeConfig.timeColumn || '時間'}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 3. Modals */}
      {/* Import & Merge Setup Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onApplyDataset={handleApplyCustomDataset}
        onLoadPreset={(p) => {
          loadPreset(p);
          setIsImportModalOpen(false);
        }}
        isLoading={isLoading}
      />

      {/* Comprehensive Data Table Modal */}
      {mergeResult && (
        <DataTableModal
          isOpen={isTableModalOpen}
          onClose={() => setIsTableModalOpen(false)}
          geojson={mergeResult.mergedGeoJSON}
          unmatchedCsv={mergeResult.unmatchedCsvRows}
          unmatchedGeo={mergeResult.unmatchedGeoFeatures}
          metricColumn={mergeConfig.metricColumn}
          selectedRegionId={selectedRegionId}
          onSelectRegion={handleSelectFromTable}
        />
      )}

      {/* Unmatched Records Inspector & Alias Mapper Modal */}
      {mergeResult && geoJsonData && (
        <UnmatchedMapperModal
          isOpen={isUnmatchedModalOpen}
          onClose={() => setIsUnmatchedModalOpen(false)}
          unmatchedRows={mergeResult.unmatchedCsvRows}
          geojson={geoJsonData}
          geoKey={mergeConfig.geoKey}
          aliasMap={mergeConfig.aliasMap}
          onUpdateAlias={handleUpdateAlias}
          onRemoveAlias={handleRemoveAlias}
        />
      )}

      {/* Project Manager & IndexedDB Persistence Modal */}
      <ProjectManagerModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        currentSession={currentSession}
        onLoadSession={handleRestoreSession}
      />
    </div>
  );
}

export default App;
