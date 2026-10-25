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
  FolderOpen,
  Camera,
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
  onOpenProjectManager: () => void;
  geojson: CustomFeatureCollection;
  onLoadPreset: (presetId: 'taiwan' | 'world' | 'us') => void;
  onExportPng: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  datasetTitle,
  matchedCount,
  totalGeoCount,
  unmatchedCsvCount,
  onOpenImport,
  onOpenTable,
  onOpenUnmatched,
  onOpenProjectManager,
  geojson,
  onLoadPreset,
  onExportPng,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  return (
    <>
      <header className="h-12 bg-slate-900 border-b border-slate-700 px-3 flex items-center justify-between gap-2 shadow-md z-30 shrink-0 text-xs">
        {/* Left: Branding & Dataset Picker */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-sky-600 text-white shadow-sm">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-xs text-white tracking-tight flex items-center gap-1.5">
                Geo Data Explorer
                <span className="text-[10px] font-mono bg-slate-800 text-sky-400 border border-slate-700 px-1 py-0.2 rounded">
                  工作台
                </span>
              </h1>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-700 mx-1 hidden sm:block" />

          {/* Dataset Switcher Dropdown */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowPresetMenu(!showPresetMenu)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-medium max-w-[150px] truncate">{datasetTitle}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showPresetMenu && (
              <div className="absolute left-0 mt-1.5 w-60 bg-slate-900 border border-slate-700 rounded shadow-xl p-1 z-40 text-xs space-y-0.5">
                <div className="px-2 py-1 text-slate-400 font-semibold border-b border-slate-800 text-[10px]">
                  切換範例資料庫
                </div>
                <button
                  onClick={() => {
                    onLoadPreset('taiwan');
                    setShowPresetMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer"
                >
                  <span>🇹🇼</span>
                  <div>
                    <div className="font-semibold">台灣各縣市發展指標</div>
                    <div className="text-[10px] text-slate-400">22 縣市 (2020-2024)</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onLoadPreset('world');
                    setShowPresetMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer"
                >
                  <span>🌍</span>
                  <div>
                    <div className="font-semibold">全球各國指標</div>
                    <div className="text-[10px] text-slate-400">177 國 (2020-2024)</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onLoadPreset('us');
                    setShowPresetMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer"
                >
                  <span>🇺🇸</span>
                  <div>
                    <div className="font-semibold">美國各州經濟與綠能</div>
                    <div className="text-[10px] text-slate-400">52 州/特區 (2021-2024)</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions & Tools */}
        <div className="flex items-center gap-1.5">
          {/* Spatial Match Status Pill */}
          <div className="hidden lg:flex items-center gap-1.5 font-mono text-[11px] bg-slate-950 border border-slate-800 px-2 py-1 rounded">
            <MapPin className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-400">空間匹配:</span>
            <strong className="text-white">{matchedCount}</strong>/{totalGeoCount} 區
          </div>

          {/* Unmatched Warning Button (if unmatched records exist) */}
          {unmatchedCsvCount > 0 && (
            <button
              onClick={onOpenUnmatched}
              title="檢視未匹配 CSV 資料（堅持真實性，絕不隨機捏造虛假座標）"
              className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">未匹配:</span>
              <span className="font-mono font-bold">{unmatchedCsvCount} 筆</span>
            </button>
          )}

          {/* Project Manager Button (IndexedDB) */}
          <button
            onClick={onOpenProjectManager}
            title="開啟專案管理與本機 IndexedDB 持久化"
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded flex items-center gap-1 transition-colors cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">專案存檔</span>
          </button>

          {/* Import / Merge Modal Button */}
          <button
            onClick={onOpenImport}
            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>匯入合併</span>
          </button>

          {/* Data Table Button */}
          <button
            onClick={onOpenTable}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Table2 className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden sm:inline">資料總表</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">匯出</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 rounded shadow-xl p-1 z-40 text-xs space-y-0.5">
                <button
                  onClick={() => {
                    exportGeoJSON(geojson);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 cursor-pointer"
                >
                  匯出合併後 GeoJSON
                </button>
                <button
                  onClick={() => {
                    exportFeaturesToCSV(geojson.features);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 cursor-pointer"
                >
                  匯出合併後 CSV 資料表
                </button>
                <button
                  onClick={() => {
                    onExportPng();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-purple-400" />
                  匯出地圖畫布截圖 (PNG)
                </button>
              </div>
            )}
          </div>

          {/* Info Button */}
          <button
            onClick={() => setShowAboutModal(true)}
            title="系統架構與資料學聲明"
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-200 text-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-sky-400" />
                關於 Geo Data Explorer
              </h3>
              <button
                onClick={() => setShowAboutModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-slate-300 leading-relaxed">
              <p>
                <strong>Geo Data Explorer</strong> 為專為地理資料分析、分級設色地圖產製而建構的前端工作台系統。
              </p>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1 text-slate-400">
                <div className="font-bold text-amber-400">嚴格的空間真實性原則：</div>
                <div>
                  • <strong>絕不捏造或隨意推測未匹配資料之座標</strong>：任何在圖資中無匹配多邊形的 CSV 記錄均獨立保存於未匹配清單中，保障統計與研究誠信。
                </div>
              </div>
              <div className="space-y-1 text-slate-400 text-[11px]">
                <div className="font-semibold text-slate-300">公開合法地圖來源聲明：</div>
                <div>• 底圖來源：OpenStreetMap 貢獻者、CARTO Positron / Dark Matter、ESRI World Imagery。</div>
                <div>• 視覺化引擎：MapLibre GL JS + ECharts。</div>
                <div>• 資料持久化：瀏覽器 IndexedDB 本機儲存。</div>
              </div>
            </div>

            <div className="pt-1 text-right">
              <button
                onClick={() => setShowAboutModal(false)}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium cursor-pointer"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
