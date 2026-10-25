import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import type { Map as MapLibreMap } from 'maplibre-gl';
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

export function App() {
  // Core Data States
  const [datasetTitle, setDatasetTitle] = useState<string>('台灣各縣市發展指標');
  const [geoJsonData, setGeoJsonData] = useState<CustomFeatureCollection | null>(null);
  const [csvData, setCsvData] = useState<CsvDataset | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
  const [activeSidePanel, setActiveSidePanel] = useState<'ranking' | 'echarts'>('echarts');

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState<boolean>(false);
  const [isUnmatchedModalOpen, setIsUnmatchedModalOpen] = useState<boolean>(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);

  // Load Preset Function
  const loadPreset = useCallback(async (presetId: 'taiwan' | 'world' | 'us') => {
    setIsLoading(true);
    setSelectedRegionId(null);
    setSelectedBreakIndex(null);
    setSearchQuery('');
    setRangeFilter(null);

    try {
      if (presetId === 'taiwan') {
        const [geoRes, csvRes] = await Promise.all([
          fetch('/presets/taiwan-counties.geojson').then((r) => r.json()),
          fetch('/presets/taiwan-metrics.csv').then((r) => r.text()),
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
          fetch('/presets/world-countries.geojson').then((r) => r.json()),
          fetch('/presets/world-metrics.csv').then((r) => r.text()),
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
          fetch('/presets/us-states.geojson').then((r) => r.json()),
          fetch('/presets/us-states-metrics.csv').then((r) => r.text()),
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
        const idKey = f.properties?._idKey || f.id || idx;
        return String(idKey) === String(selectedRegionId);
      }) || null
    );
  }, [mergeResult, selectedRegionId]);

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
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
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
        geojson={mergeResult?.mergedGeoJSON ?? { type: 'FeatureCollection', features: [] }}
        onLoadPreset={loadPreset}
        onExportPng={() => exportMapImage(mapInstanceRef.current)}
      />

      {/* 2. Main Geospatial Workspace */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {isLoading || !mergeResult ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-2">
            <div className="w-8 h-8 border-3 border-sky-500/20 border-t-sky-400 rounded-full animate-spin" />
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
              onSelectRegion={setSelectedRegionId}
              selectedBreakIndex={selectedBreakIndex}
              searchFilter={searchQuery}
              rangeFilter={rangeFilter}
              onMapReady={(map) => {
                mapInstanceRef.current = map;
              }}
            />

            {/* Floating Top Filter Bar & Unmatched Warning */}
            <div className="absolute top-3 left-3 right-16 md:right-auto md:w-[600px] z-10 space-y-2 pointer-events-auto">
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

            {/* Selected Region Detailed Inspector Card */}
            {selectedFeature && (
              <RegionDetailCard
                feature={selectedFeature}
                metricColumn={mergeConfig.metricColumn}
                onClose={() => setSelectedRegionId(null)}
              />
            )}

            {/* Floating Right Dock: ECharts Analytics and Ranking */}
            <div className="absolute top-16 right-3 z-10 flex flex-col items-end gap-2 pointer-events-auto">
              {/* Tab selector between Leaderboard and ECharts */}
              <div className="bg-slate-900 border border-slate-700 rounded p-0.5 flex gap-0.5 shadow-md text-[11px]">
                <button
                  onClick={() => setActiveSidePanel('echarts')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    activeSidePanel === 'echarts' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ECharts 分析圖
                </button>
                <button
                  onClick={() => setActiveSidePanel('ranking')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    activeSidePanel === 'ranking' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  排行清單
                </button>
              </div>

              {activeSidePanel === 'echarts' ? (
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
                  onSelectRegion={setSelectedRegionId}
                />
              ) : (
                <Leaderboard
                  geojson={mergeResult.mergedGeoJSON}
                  metricColumn={mergeConfig.metricColumn}
                  stats={mergeResult.activeStats}
                  selectedRegionId={selectedRegionId}
                  onSelectRegion={setSelectedRegionId}
                />
              )}
            </div>

            {/* Floating Bottom Left: Multi-Period Time Slider */}
            {mergeResult.timeValues.length > 1 && (
              <div className="absolute bottom-5 left-3 z-10 w-96 max-w-[calc(100vw-24px)] pointer-events-auto">
                <TimeSlider
                  timeValues={mergeResult.timeValues}
                  selectedTime={mergeConfig.selectedTime}
                  onTimeChange={(t) => setMergeConfig((prev) => ({ ...prev, selectedTime: t }))}
                  timeColumnName={mergeConfig.timeColumn || '時間'}
                />
              </div>
            )}

            {/* Floating Bottom Right: Interactive Legend & Classification */}
            <div className="absolute bottom-5 right-3 z-10 w-72 max-w-[calc(100vw-24px)] pointer-events-auto">
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
          onSelectRegion={setSelectedRegionId}
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
