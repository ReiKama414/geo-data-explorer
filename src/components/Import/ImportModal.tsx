import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  Upload,
  Globe2,
  FileCode,
  FileSpreadsheet,
  Check,
  AlertCircle,
  X,
  Sparkles,
  Link2,
} from 'lucide-react';
import type {
  CustomFeatureCollection,
  CsvDataset,
  MergeConfig,
} from '../../types';
import {
  getGeoKeyCandidates,
  getCsvKeyCandidates,
  detectTimeColumn,
  extractTimeValues,
  detectNumericColumns,
  suggestBestKeyMatch,
  normalizeKey,
} from '../../utils/dataMerge';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDataset: (
    geojson: CustomFeatureCollection,
    csv: CsvDataset,
    config: MergeConfig,
    datasetTitle: string
  ) => void;
  onLoadPreset: (presetId: 'taiwan' | 'world' | 'us') => void;
  isLoading: boolean;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onApplyDataset,
  onLoadPreset,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');

  // Custom upload states
  const [geoJsonData, setGeoJsonData] = useState<CustomFeatureCollection | null>(null);
  const [geoFileName, setGeoFileName] = useState<string>('');
  const [csvData, setCsvData] = useState<CsvDataset | null>(null);
  const [csvFileName, setCsvFileName] = useState<string>('');

  // Key configurations
  const [selectedGeoKey, setSelectedGeoKey] = useState<string>('');
  const [selectedCsvKey, setSelectedCsvKey] = useState<string>('');
  const [selectedTimeCol, setSelectedTimeCol] = useState<string>('');
  const [selectedMetricCol, setSelectedMetricCol] = useState<string>('');
  const [datasetTitle, setDatasetTitle] = useState<string>('自訂地理資料集');

  const [geoError, setGeoError] = useState<string>('');
  const [csvError, setCsvError] = useState<string>('');

  // Handle GeoJSON File Upload
  const handleGeoFileUpload = (file: File) => {
    setGeoError('');
    setGeoFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
          throw new Error('JSON 格式必須為標準 GeoJSON FeatureCollection (包含 features 陣列)');
        }
        setGeoJsonData(parsed);

        // Auto choose geo key
        const candidates = getGeoKeyCandidates(parsed);
        if (candidates.length > 0) {
          setSelectedGeoKey(candidates[0]);
        }
      } catch (err: any) {
        setGeoError(err.message || '無法解析 GeoJSON 檔案');
        setGeoJsonData(null);
      }
    };
    reader.readAsText(file);
  };

  // Handle CSV File Upload
  const handleCsvFileUpload = (file: File) => {
    setCsvError('');
    setCsvFileName(file.name);
    Papa.parse<Record<string, any>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setCsvError('CSV 檔案為空或無法讀取標題行');
          setCsvData(null);
          return;
        }

        const headers = results.meta.fields || Object.keys(results.data[0]);
        const dataset: CsvDataset = {
          fileName: file.name,
          headers,
          rows: results.data,
          totalRows: results.data.length,
        };
        setCsvData(dataset);

        // Auto detect keys, time, metric
        const csvCandidates = getCsvKeyCandidates(dataset);
        if (csvCandidates.length > 0) {
          setSelectedCsvKey(csvCandidates[0]);
        }

        const detectedTime = detectTimeColumn(dataset);
        setSelectedTimeCol(detectedTime || '');

        const numerics = detectNumericColumns(dataset, [csvCandidates[0] || '', detectedTime || '']);
        if (numerics.length > 0) {
          setSelectedMetricCol(numerics[0]);
        }

        // If geoJsonData already loaded, suggest best match
        if (geoJsonData) {
          const suggestion = suggestBestKeyMatch(geoJsonData, dataset);
          if (suggestion.score > 0) {
            setSelectedGeoKey(suggestion.geoKey);
            setSelectedCsvKey(suggestion.csvKey);
          }
        }
      },
      error: (err) => {
        setCsvError(err.message || '無法解析 CSV 檔案');
        setCsvData(null);
      },
    });
  };

  // Match preview statistics
  const matchPreview = React.useMemo(() => {
    if (!geoJsonData || !csvData || !selectedGeoKey || !selectedCsvKey) return null;

    const geoKeys = new Set(
      geoJsonData.features.map((f) => normalizeKey(f.properties?.[selectedGeoKey]))
    );

    let matchCount = 0;
    const testRows = csvData.rows.slice(0, 200);
    testRows.forEach((r) => {
      const k = normalizeKey(r[selectedCsvKey]);
      if (k && geoKeys.has(k)) {
        matchCount++;
      }
    });

    const pct = Math.round((matchCount / Math.max(1, testRows.length)) * 100);
    return {
      matchCount,
      sampleTotal: testRows.length,
      pct,
    };
  }, [geoJsonData, csvData, selectedGeoKey, selectedCsvKey]);

  const handleApplyCustom = () => {
    if (!geoJsonData || !csvData || !selectedGeoKey || !selectedCsvKey || !selectedMetricCol) {
      alert('請確認已上傳 GeoJSON 與 CSV，並選定地區匹配代碼與分析指標！');
      return;
    }

    const timeValues = extractTimeValues(csvData, selectedTimeCol || null);
    const defaultTime = timeValues.length > 0 ? timeValues[timeValues.length - 1] : null;

    const config: MergeConfig = {
      geoKey: selectedGeoKey,
      csvKey: selectedCsvKey,
      timeColumn: selectedTimeCol || null,
      selectedTime: defaultTime,
      metricColumn: selectedMetricCol,
      aliasMap: {},
    };

    onApplyDataset(geoJsonData, csvData, config, datasetTitle || '自訂資料集');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">匯入地理圖資與數據</h2>
              <p className="text-xs text-slate-400">
                可選擇精選範例資料集，或自行匯入 GeoJSON 與 CSV 進行代碼合併
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-2">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            精選範例資料庫 (一鍵載入)
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            自訂 GeoJSON 與 CSV 匯入
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'presets' ? (
            <div className="space-y-3">
              <div className="text-slate-400 mb-2">
                直接選擇預先載入的高品質多期地理資料，立即體驗完整分級設色、時間切換與未匹配診斷功能：
              </div>

              {/* Preset 1: Taiwan */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl hover:border-sky-500/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🇹🇼</span>
                    <h3 className="font-bold text-slate-100 text-sm">
                      台灣各縣市發展指標 (2020 - 2024)
                    </h3>
                    <span className="bg-sky-500/20 text-sky-300 font-mono text-[10px] px-2 py-0.5 rounded-full">
                      22 縣市 • 5 年期
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs">
                    包含人口數、綜合所得中位數、老化指數、太陽光電容量、平均房價等指標。
                  </p>
                  <p className="text-amber-400/90 text-[11px] font-mono">
                    ⚠️ 內建包含 2 筆非建制保護區測試資料，展示未匹配且不捏造座標之保護機制。
                  </p>
                </div>

                <button
                  onClick={() => onLoadPreset('taiwan')}
                  disabled={isLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-sky-600/20 transition-all shrink-0 cursor-pointer"
                >
                  載入台灣資料集
                </button>
              </div>

              {/* Preset 2: World */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl hover:border-sky-500/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌍</span>
                    <h3 className="font-bold text-slate-100 text-sm">
                      全球國家發展指標 (2020 - 2024)
                    </h3>
                    <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] px-2 py-0.5 rounded-full">
                      177 國 • 5 年期
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs">
                    Natural Earth 向量國界，包含人均 GDP、預期壽命、再生能源比例與網路普及率。
                  </p>
                  <p className="text-amber-400/90 text-[11px] font-mono">
                    ⚠️ 內建包含深海科研站等未匹配代碼以展示診斷。
                  </p>
                </div>

                <button
                  onClick={() => onLoadPreset('world')}
                  disabled={isLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all shrink-0 cursor-pointer"
                >
                  載入全球資料集
                </button>
              </div>

              {/* Preset 3: US States */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl hover:border-sky-500/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🇺🇸</span>
                    <h3 className="font-bold text-slate-100 text-sm">
                      美國各州經濟與綠能普及 (2021 - 2024)
                    </h3>
                    <span className="bg-purple-500/20 text-purple-300 font-mono text-[10px] px-2 py-0.5 rounded-full">
                      52 州/特區 • 4 年期
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs">
                    包含家庭收入中位數、電動車新車佔比 (EV %)、潔淨綠能發電佔比。
                  </p>
                </div>

                <button
                  onClick={() => onLoadPreset('us')}
                  disabled={isLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all shrink-0 cursor-pointer"
                >
                  載入美國資料集
                </button>
              </div>
            </div>
          ) : (
            /* Custom Tab */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* GeoJSON Upload Box */}
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-sky-400" />
                      <span className="font-bold text-slate-200">1. GeoJSON 地理檔案</span>
                    </div>
                    {geoJsonData && (
                      <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                        <Check className="w-3.5 h-3.5" /> {geoJsonData.features.length} 個圖徵
                      </span>
                    )}
                  </div>

                  <label className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-900/40">
                    <Globe2 className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-slate-200 font-medium">點擊選取或拖曳 GeoJSON 檔案</span>
                    <span className="text-slate-500 text-[10px] mt-0.5">.geojson, .json</span>
                    <input
                      type="file"
                      accept=".geojson,.json,application/json"
                      onChange={(e) => e.target.files?.[0] && handleGeoFileUpload(e.target.files[0])}
                      className="hidden"
                    />
                  </label>

                  {geoFileName && (
                    <div className="font-mono text-slate-400 text-[11px] truncate">
                      已選擇: {geoFileName}
                    </div>
                  )}
                  {geoError && (
                    <div className="text-rose-400 text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {geoError}
                    </div>
                  )}
                </div>

                {/* CSV Upload Box */}
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-slate-200">2. CSV 數據檔案</span>
                    </div>
                    {csvData && (
                      <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                        <Check className="w-3.5 h-3.5" /> {csvData.totalRows} 筆資料
                      </span>
                    )}
                  </div>

                  <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-900/40">
                    <FileSpreadsheet className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-slate-200 font-medium">點擊選取或拖曳 CSV 數據檔案</span>
                    <span className="text-slate-500 text-[10px] mt-0.5">支援 UTF-8、自動標題與類型探測</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => e.target.files?.[0] && handleCsvFileUpload(e.target.files[0])}
                      className="hidden"
                    />
                  </label>

                  {csvFileName && (
                    <div className="font-mono text-slate-400 text-[11px] truncate">
                      已選擇: {csvFileName}
                    </div>
                  )}
                  {csvError && (
                    <div className="text-rose-400 text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {csvError}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Key Join Configuration */}
              {geoJsonData && csvData && (
                <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                    <Link2 className="w-4 h-4" />
                    <span>3. 地理代碼合併與欄位對應設定</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* GeoJSON Key */}
                    <div>
                      <label className="text-slate-400 block mb-1">GeoJSON 地區代碼屬性 (圖資鍵值)</label>
                      <select
                        value={selectedGeoKey}
                        onChange={(e) => setSelectedGeoKey(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                      >
                        {getGeoKeyCandidates(geoJsonData).map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* CSV Key */}
                    <div>
                      <label className="text-slate-400 block mb-1">CSV 地區代碼欄位 (數據鍵值)</label>
                      <select
                        value={selectedCsvKey}
                        onChange={(e) => setSelectedCsvKey(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                      >
                        {getCsvKeyCandidates(csvData).map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Time Column */}
                    <div>
                      <label className="text-slate-400 block mb-1">時間切換欄位 (選填，如年份/季度)</label>
                      <select
                        value={selectedTimeCol}
                        onChange={(e) => setSelectedTimeCol(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                      >
                        <option value="">-- 無時間維度 (靜態資料) --</option>
                        {csvData.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Metric Column */}
                    <div>
                      <label className="text-slate-400 block mb-1">預設分級設色數值指標</label>
                      <select
                        value={selectedMetricCol}
                        onChange={(e) => setSelectedMetricCol(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                      >
                        {detectNumericColumns(csvData).map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Join Simulation Diagnosis */}
                  {matchPreview && (
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-slate-300 font-semibold">智慧匹配探測結果：</span>
                        <div className="text-slate-400 text-[11px]">
                          抽樣前 {matchPreview.sampleTotal} 筆中，成功匹配 {matchPreview.matchCount} 筆 (
                          {matchPreview.pct}%)
                        </div>
                      </div>
                      <span
                        className={`font-mono text-sm font-bold px-2.5 py-1 rounded-lg ${
                          matchPreview.pct >= 70
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        匹配度 {matchPreview.pct}%
                      </span>
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className="text-slate-400 block mb-1">專案自訂名稱</label>
                    <input
                      type="text"
                      value={datasetTitle}
                      onChange={(e) => setDatasetTitle(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-slate-500 text-[11px]">
            所有資料皆在瀏覽器端本機運算，不傳送至外部伺服器
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
            >
              取消
            </button>
            {activeTab === 'custom' && (
              <button
                onClick={handleApplyCustom}
                disabled={!geoJsonData || !csvData || !selectedGeoKey || !selectedCsvKey}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer transition-all"
              >
                套用並探索地圖
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
