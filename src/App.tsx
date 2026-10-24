import { useState, useEffect, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import type {
  CustomFeatureCollection,
  CsvDataset,
  MergeConfig,
  ClassificationMethod,
  PaletteId,
} from './types';
import { performDataMerge } from './utils/dataMerge';
import { Header } from './components/Header/Header';
import { ChoroplethMap } from './components/Map/ChoroplethMap';
import { Legend } from './components/Legend/Legend';
import { TimeSlider } from './components/Timeline/TimeSlider';
import { FilterBar } from './components/Filters/FilterBar';
import { Leaderboard } from './components/Ranking/Leaderboard';
import { DataTableModal } from './components/Table/DataTableModal';
import { ImportModal } from './components/Import/ImportModal';
import { UnmatchedBanner, UnmatchedMapperModal } from './components/Unmatched/UnmatchedMapperModal';
import { RegionDetailCard } from './components/Map/RegionDetailCard';

export function App() {
  // Core Data States
  const [datasetTitle, setDatasetTitle] = useState<string>('台灣各縣市發展指標');
  const [geoJsonData, setGeoJsonData] = useState<CustomFeatureCollection | null>(null);
  const [csvData, setCsvData] = useState<CsvDataset | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState<boolean>(false);
  const [isUnmatchedModalOpen, setIsUnmatchedModalOpen] = useState<boolean>(false);

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

  // Initial Load (Taiwan Counties)
  useEffect(() => {
    loadPreset('taiwan');
  }, [loadPreset]);

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
        geojson={mergeResult?.mergedGeoJSON ?? { type: 'FeatureCollection', features: [] }}
        onLoadPreset={loadPreset}
      />

      {/* 2. Main Geospatial Workspace */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {isLoading || !mergeResult ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
            <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-400 rounded-full animate-spin" />
            <p className="font-semibold text-sm">正在載入地理向量圖資與合併數據...</p>
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
            />

            {/* Floating Top Filter Bar & Unmatched Warning */}
            <div className="absolute top-4 left-4 right-16 md:right-auto md:w-[620px] z-10 space-y-2 pointer-events-auto">
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

            {/* Floating Right Side: Regional Leaderboard & Rankings */}
            <div className="absolute top-20 right-4 z-10 pointer-events-auto">
              <Leaderboard
                geojson={mergeResult.mergedGeoJSON}
                metricColumn={mergeConfig.metricColumn}
                stats={mergeResult.activeStats}
                selectedRegionId={selectedRegionId}
                onSelectRegion={setSelectedRegionId}
              />
            </div>

            {/* Floating Bottom Left: Multi-Period Time Slider */}
            {mergeResult.timeValues.length > 1 && (
              <div className="absolute bottom-6 left-4 z-10 w-96 max-w-[calc(100vw-32px)] pointer-events-auto">
                <TimeSlider
                  timeValues={mergeResult.timeValues}
                  selectedTime={mergeConfig.selectedTime}
                  onTimeChange={(t) => setMergeConfig((prev) => ({ ...prev, selectedTime: t }))}
                  timeColumnName={mergeConfig.timeColumn || '時間'}
                />
              </div>
            )}

            {/* Floating Bottom Right: Interactive Legend & Classification */}
            <div className="absolute bottom-6 right-4 z-10 w-72 max-w-[calc(100vw-32px)] pointer-events-auto">
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
    </div>
  );
}

export default App;
