import React, { useState } from 'react';
import {
  Compass,
  Upload,
  Table2,
  Download,
  AlertTriangle,
  ChevronDown,
  Info,
  Layers,
  MapPin,
} from 'lucide-react';
import { exportGeoJSON, exportFeaturesToCSV } from '../../utils/exportUtils';
import type { CustomFeatureCollection } from '../../types';

interface HeaderProps {
  datasetTitle: string;
  matchedCount: number;
  totalGeoCount: number;
  unmatchedCsvCount: number;
  onOpenImport: () => void;
  onOpenTable: () => void;
  onOpenUnmatched: () => void;
  geojson: CustomFeatureCollection;
  onLoadPreset: (presetId: 'taiwan' | 'world' | 'us') => void;
}

export const Header: React.FC<HeaderProps> = ({
  datasetTitle,
  matchedCount,
  totalGeoCount,
  unmatchedCsvCount,
  onOpenImport,
  onOpenTable,
  onOpenUnmatched,
  geojson,
  onLoadPreset,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  return (
    <>
      <header className="h-14 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between gap-3 shadow-lg z-30 shrink-0 backdrop-blur-md">
        {/* Left: Branding & Dataset Picker */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-black text-sm text-white tracking-tight flex items-center gap-1.5">
                Geo Data Explorer
                <span className="text-[10px] font-semibold font-mono bg-sky-500/20 text-sky-400 border border-sky-500/30 px-1.5 py-0.2 rounded">
                  v1.0
                </span>
              </h1>
              <span className="text-[10px] text-slate-400 block -mt-0.5">地理資料分析與設色平台</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Dataset Switcher Dropdown */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowPresetMenu(!showPresetMenu)}
              className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold max-w-[140px] truncate">{datasetTitle}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showPresetMenu && (
              <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-40 text-xs space-y-1">
                <div className="px-2 py-1 text-slate-400 font-semibold border-b border-slate-800 text-[10px]">
                  切換範例資料集
                </div>
                <button
                  onClick={() => {
                    onLoadPreset('taiwan');
                    setShowPresetMenu(false);
                  }}
                  className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer"
                >
                  <span>🇹🇼</span>
                  <div>
                    <div className="font-bold">台灣各縣市發展指標</div>
                    <div className="text-[10px] text-slate-400">22 縣市 (2020-2024)</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onLoadPreset('world');
                    setShowPresetMenu(false);
                  }}
                  className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer"
                >
                  <span>🌍</span>
                  <div>
                    <div className="font-bold">全球各國指標</div>
                    <div className="text-[10px] text-slate-400">177 國 (2020-2024)</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onLoadPreset('us');
                    setShowPresetMenu(false);
                  }}
                  className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer"
                >
                  <span>🇺🇸</span>
                  <div>
                    <div className="font-bold">美國各州經濟與綠能</div>
                    <div className="text-[10px] text-slate-400">52 州/特區 (2021-2024)</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 text-xs">
          {/* Spatial Match Status Pill */}
          <div className="hidden lg:flex items-center gap-2 font-mono text-[11px] bg-slate-950/70 border border-slate-800 px-2.5 py-1 rounded-xl">
            <span className="flex items-center gap-1 text-slate-300">
              <MapPin className="w-3 h-3 text-emerald-400" />
              已匹配: <strong className="text-white">{matchedCount}</strong>/{totalGeoCount} 區
            </span>
          </div>

          {/* Unmatched Warning Button (if unmatched records exist) */}
          {unmatchedCsvCount > 0 && (
            <button
              onClick={onOpenUnmatched}
              title="檢視未匹配 CSV 資料（堅持真實性，絕不隨機捏造虛假座標）"
              className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl flex items-center gap-1.5 font-medium transition-all animate-pulse cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">未匹配資料</span>
              <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                {unmatchedCsvCount}
              </span>
            </button>
          )}

          {/* Import / Merge Modal Button */}
          <button
            onClick={onOpenImport}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-xl flex items-center gap-1.5 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">匯入與合併</span>
          </button>

          {/* Data Table Button */}
          <button
            onClick={onOpenTable}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Table2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">資料總表</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">匯出</span>
              <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-40 text-xs space-y-1">
                <button
                  onClick={() => {
                    exportGeoJSON(geojson);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 cursor-pointer"
                >
                  匯出合併後 GeoJSON
                </button>
                <button
                  onClick={() => {
                    exportFeaturesToCSV(geojson.features);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 cursor-pointer"
                >
                  匯出合併後 CSV 資料表
                </button>
              </div>
            )}
          </div>

          {/* Info Button */}
          <button
            onClick={() => setShowAboutModal(true)}
            title="關於系統與方法學"
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200 text-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-sky-400" />
                關於 Geo Data Explorer
              </h3>
              <button
                onClick={() => setShowAboutModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-slate-300 leading-relaxed">
              <p>
                <strong>Geo Data Explorer</strong> 是一套專為地理數據分析設計的前端視覺化系統，支援直接在瀏覽器端匯入標準 GeoJSON 向量邊界與 CSV 屬性數據。
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-slate-400">
                <div className="font-bold text-sky-400">嚴格的地理真實性原則：</div>
                <div>
                  • <strong>不捏造虛假座標</strong>：對於在 GeoJSON 中找不到幾何多邊形的 CSV 記錄，本系統絕不會隨機填補或推測經緯度點位，而是完整留存於未匹配診斷報表中，確保統計與空間分析之科學嚴謹。
                </div>
              </div>
              <div className="space-y-1 text-slate-400">
                <div className="font-semibold text-slate-300">公開合法地圖來源聲明：</div>
                <div>• 底圖來源：OpenStreetMap 貢獻者、CARTO Positron / Dark Matter、ESRI World Imagery。</div>
                <div>• 向量渲染引擎：MapLibre GL JS。</div>
                <div>• 部署：靜態前端優化，可直接上線於 Cloudflare Pages。</div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowAboutModal(false)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold cursor-pointer"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
