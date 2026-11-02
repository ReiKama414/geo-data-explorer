import React, { useState, useRef, useEffect } from 'react';
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
  Sun,
  Moon,
  Laptop,
  Menu,
  X,
  BarChart3,
} from 'lucide-react';
import { exportGeoJSON, exportFeaturesToCSV } from '../../utils/exportUtils';
import type { CustomFeatureCollection } from '../../types';
import type { ThemeMode, ResolvedTheme } from '../../services/theme';

interface HeaderProps {
  datasetTitle: string;
  matchedCount: number;
  totalGeoCount: number;
  unmatchedCsvCount: number;
  onOpenImport: () => void;
  onOpenTable: () => void;
  onOpenUnmatched: () => void;
  onOpenProjectManager: () => void;
  onOpenAnalytics?: () => void;
  geojson: CustomFeatureCollection;
  onLoadPreset: (presetId: 'taiwan' | 'world' | 'us') => void;
  onExportPng: () => void;
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  onSetTheme: (theme: ThemeMode) => void;
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
  onOpenAnalytics,
  geojson,
  onLoadPreset,
  onExportPng,
  theme,
  resolvedTheme,
  onSetTheme,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // 點擊 header 以外區域或按下 Esc 時關閉下拉選單 / 說明視窗
  useEffect(() => {
    if (!showExportMenu && !showPresetMenu && !showThemeMenu && !showAboutModal) return;
    const closeAll = () => {
      setShowExportMenu(false);
      setShowPresetMenu(false);
      setShowThemeMenu(false);
    };
    const onPointerDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) closeAll();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAll();
        setShowAboutModal(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showExportMenu, showPresetMenu, showThemeMenu, showAboutModal]);

  // 一次僅開啟一個下拉選單，避免多個選單同時重疊
  const toggleMenu = (menu: 'export' | 'preset' | 'theme') => {
    setShowExportMenu(menu === 'export' ? (v) => !v : false);
    setShowPresetMenu(menu === 'preset' ? (v) => !v : false);
    setShowThemeMenu(menu === 'theme' ? (v) => !v : false);
  };

  return (
    <>
      <header ref={headerRef} className="h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 flex items-center justify-between gap-2 shadow-xs z-30 shrink-0 text-xs text-slate-800 dark:text-slate-100 transition-colors">
        {/* Left: Branding & Dataset Picker */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="p-1.5 rounded-lg bg-slate-900 text-white dark:bg-sky-600 shadow-xs">
              <Compass className="w-4 h-4" />
            </div>
            <h1 className="font-bold text-xs tracking-tight truncate flex items-center gap-1">
              <span>Geo Data Explorer</span>
              <span className="hidden lg:inline text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700 px-1 py-0.2 rounded">
                工作台
              </span>
            </h1>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block" />

          {/* Dataset Switcher Dropdown (Desktop) */}
          <div className="relative hidden md:block">
            <button
              onClick={() => toggleMenu('preset')}
              className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-sky-400" />
              <span className="font-medium max-w-[90px] lg:max-w-[140px] truncate">{datasetTitle}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showPresetMenu && (
              <div className="absolute left-0 mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-xl p-1 z-40 text-xs space-y-0.5">
                <div className="px-2 py-1 text-slate-400 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 text-[10px]">
                  切換範例資料庫
                </div>
                <button
                  onClick={() => {
                    onLoadPreset('taiwan');
                    setShowPresetMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-sm">🇹🇼</span>
                  <div className="truncate">
                    <div className="font-semibold truncate">台灣各縣市發展指標</div>
                    <div className="text-[10px] text-slate-400">22 縣市 (2020-2024)</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onLoadPreset('world');
                    setShowPresetMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-sm">🌍</span>
                  <div className="truncate">
                    <div className="font-semibold truncate">全球各國指標</div>
                    <div className="text-[10px] text-slate-400">177 國 (2020-2024)</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onLoadPreset('us');
                    setShowPresetMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-sm">🇺🇸</span>
                  <div className="truncate">
                    <div className="font-semibold truncate">美國各州經濟與綠能</div>
                    <div className="text-[10px] text-slate-400">52 州/特區 (2021-2024)</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions & Tools */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Spatial Match Status Pill (Desktop only) */}
          <div className="hidden xl:flex items-center gap-1.5 font-mono text-[11px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded">
            <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-slate-500 dark:text-slate-400">空間匹配:</span>
            <strong className="text-slate-900 dark:text-white">{matchedCount}</strong>/{totalGeoCount} 區
          </div>

          {/* Unmatched Warning Button (if unmatched records exist) */}
          {unmatchedCsvCount > 0 && (
            <button
              onClick={onOpenUnmatched}
              title="檢視未匹配 CSV 資料（堅持真實性，絕不隨機捏造虛假座標）"
              className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-500/40 rounded flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">未匹配:</span>
              <span className="font-mono font-bold">{unmatchedCsvCount} 筆</span>
            </button>
          )}

          {/* Theme Switcher Button */}
          <div className="relative">
            <button
              data-testid="theme-toggle-btn"
              aria-label="切換外觀主題"
              onClick={() => toggleMenu('theme')}
              title={`目前主題: ${theme === 'system' ? '跟隨系統' : theme === 'dark' ? '深色模式' : '淺色模式'}`}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer flex items-center gap-1"
            >
              {theme === 'system' ? (
                <Laptop className="w-3.5 h-3.5" />
              ) : resolvedTheme === 'dark' ? (
                <Moon className="w-3.5 h-3.5" />
              ) : (
                <Sun className="w-3.5 h-3.5" />
              )}
            </button>

            {showThemeMenu && (
              <div className="absolute right-0 mt-1.5 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-xl p-1 z-40 text-xs space-y-0.5">
                <button
                  onClick={() => {
                    onSetTheme('system');
                    setShowThemeMenu(false);
                  }}
                  className={`w-full text-left px-2 py-1 rounded flex items-center gap-2 cursor-pointer ${
                    theme === 'system'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>跟隨系統</span>
                </button>
                <button
                  onClick={() => {
                    onSetTheme('light');
                    setShowThemeMenu(false);
                  }}
                  className={`w-full text-left px-2 py-1 rounded flex items-center gap-2 cursor-pointer ${
                    theme === 'light'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>淺色模式</span>
                </button>
                <button
                  onClick={() => {
                    onSetTheme('dark');
                    setShowThemeMenu(false);
                  }}
                  className={`w-full text-left px-2 py-1 rounded flex items-center gap-2 cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>深色模式</span>
                </button>
              </div>
            )}
          </div>

          {/* Desktop Toolbar Buttons */}
          <div className="hidden sm:flex items-center gap-1.5">
            {/* Project Manager Button (IndexedDB) */}
            <button
              onClick={onOpenProjectManager}
              title="專案管理與本機 IndexedDB 持久化"
              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded flex items-center gap-1 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-600 dark:text-sky-400" />
              <span className="hidden xl:inline">專案存檔</span>
            </button>

            {/* Import / Merge Modal Button */}
            <button
              onClick={onOpenImport}
              title="匯入合併 GeoJSON 與 CSV"
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white dark:bg-sky-600 dark:hover:bg-sky-500 dark:text-white font-medium rounded flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">匯入合併</span>
            </button>

            {/* Data Table Button */}
            <button
              onClick={onOpenTable}
              title="資料總表"
              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Table2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span className="hidden xl:inline">資料總表</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('export')}
                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>匯出</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-xl p-1 z-40 text-xs space-y-0.5">
                  <button
                    onClick={() => {
                      exportGeoJSON(geojson);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    匯出合併後 GeoJSON
                  </button>
                  <button
                    onClick={() => {
                      exportFeaturesToCSV(geojson.features);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    匯出合併後 CSV 資料表
                  </button>
                  <button
                    onClick={() => {
                      onExportPng();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    匯出地圖畫布截圖 (PNG)
                  </button>
                </div>
              )}
            </div>

            {/* Info Button */}
            <button
              onClick={() => setShowAboutModal(true)}
              title="系統架構與說明"
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Analytics Trigger (< 1024px) */}
          <div className="lg:hidden flex items-center">
            <button
              data-testid="header-analytics-btn"
              aria-label="開啟圖表與排行"
              onClick={onOpenAnalytics}
              className="p-1.5 text-slate-700 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="開啟圖表與排行"
            >
              <BarChart3 className="w-4 h-4 text-slate-700 dark:text-sky-400" />
            </button>
          </div>

          {/* Mobile Hamburger Drawer Trigger (< 640px) */}
          <div className="sm:hidden flex items-center">
            <button
              data-testid="mobile-hamburger-btn"
              aria-label="開啟功能選單"
              onClick={() => setShowMobileDrawer(true)}
              className="p-1.5 text-slate-700 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="開啟功能選單"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer (< 640px) */}
      {showMobileDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-72 max-w-[85vw] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col p-4 space-y-4 shadow-2xl text-xs overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>工作台功能選單</span>
              </div>
              <button
                data-testid="close-mobile-drawer"
                aria-label="關閉選單"
                onClick={() => setShowMobileDrawer(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Theme Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                外觀主題模式
              </label>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => onSetTheme('system')}
                  className={`py-1.5 px-1.5 rounded flex items-center justify-center gap-1 font-medium text-xs cursor-pointer transition-colors ${
                    theme === 'system'
                      ? 'bg-slate-900 text-white dark:bg-sky-600 font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" /> 跟隨系統
                </button>
                <button
                  onClick={() => onSetTheme('light')}
                  className={`py-1.5 px-1.5 rounded flex items-center justify-center gap-1 font-medium text-xs cursor-pointer transition-colors ${
                    theme === 'light'
                      ? 'bg-slate-900 text-white dark:bg-sky-600 font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" /> 淺色
                </button>
                <button
                  onClick={() => onSetTheme('dark')}
                  className={`py-1.5 px-1.5 rounded flex items-center justify-center gap-1 font-medium text-xs cursor-pointer transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-900 text-white dark:bg-sky-600 font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" /> 深色
                </button>
              </div>
            </div>

            {/* Preset Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                範例資料庫
              </label>
              <div className="grid grid-cols-1 gap-1">
                <button
                  onClick={() => {
                    onLoadPreset('taiwan');
                    setShowMobileDrawer(false);
                  }}
                  className="w-full text-left p-2 rounded bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <span>🇹🇼</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">台灣各縣市發展指標</span>
                </button>
                <button
                  onClick={() => {
                    onLoadPreset('world');
                    setShowMobileDrawer(false);
                  }}
                  className="w-full text-left p-2 rounded bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <span>🌍</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">全球各國指標</span>
                </button>
                <button
                  onClick={() => {
                    onLoadPreset('us');
                    setShowMobileDrawer(false);
                  }}
                  className="w-full text-left p-2 rounded bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <span>🇺🇸</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">美國各州經濟與綠能</span>
                </button>
              </div>
            </div>

            {/* Core Actions List */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                分析與資料工具
              </label>
              <button
                onClick={() => {
                  onOpenImport();
                  setShowMobileDrawer(false);
                }}
                className="w-full p-2.5 rounded bg-slate-900 text-white dark:bg-sky-600 font-semibold flex items-center gap-2 text-left"
              >
                <Upload className="w-4 h-4" /> 匯入 GeoJSON 與 CSV
              </button>
              <button
                onClick={() => {
                  onOpenTable();
                  setShowMobileDrawer(false);
                }}
                className="w-full p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center gap-2 text-left"
              >
                <Table2 className="w-4 h-4" /> 檢視資料總表
              </button>
              <button
                onClick={() => {
                  onOpenProjectManager();
                  setShowMobileDrawer(false);
                }}
                className="w-full p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center gap-2 text-left"
              >
                <FolderOpen className="w-4 h-4 text-sky-500" /> 專案存檔 (IndexedDB)
              </button>
            </div>

            {/* Export Section */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                資料與畫面匯出
              </label>
              <button
                onClick={() => {
                  exportGeoJSON(geojson);
                  setShowMobileDrawer(false);
                }}
                className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 text-left"
              >
                <Download className="w-4 h-4 text-emerald-500" /> 匯出 GeoJSON 檔案
              </button>
              <button
                onClick={() => {
                  exportFeaturesToCSV(geojson.features);
                  setShowMobileDrawer(false);
                }}
                className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 text-left"
              >
                <Download className="w-4 h-4 text-emerald-500" /> 匯出 CSV 資料表
              </button>
              <button
                onClick={() => {
                  onExportPng();
                  setShowMobileDrawer(false);
                }}
                className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 text-left"
              >
                <Camera className="w-4 h-4 text-purple-500" /> 匯出地圖畫布截圖
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
              <span>已匹配: {matchedCount}/{totalGeoCount} 區</span>
              <button
                onClick={() => {
                  setShowAboutModal(true);
                  setShowMobileDrawer(false);
                }}
                className="underline hover:text-slate-600 dark:hover:text-slate-200"
              >
                關於系統
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200 text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-w-lg w-full p-4 space-y-3 text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-sm flex items-center gap-1.5 text-slate-900 dark:text-white">
                <Compass className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                關於 Geo Data Explorer
              </h3>
              <button
                onClick={() => setShowAboutModal(false)}
                aria-label="關閉說明視窗"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 leading-relaxed text-slate-600 dark:text-slate-300">
              <p>
                <strong>Geo Data Explorer</strong> 為專為地理資料分析、分級設色地圖產製而建構的前端工作台系統。
              </p>
              <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 space-y-1 text-slate-600 dark:text-slate-400">
                <div className="font-bold text-amber-600 dark:text-amber-400">嚴格的空間真實性原則：</div>
                <div>
                  • <strong>絕不捏造或隨意推測未匹配資料之座標</strong>：任何在圖資中無匹配多邊形的 CSV 記錄均獨立保存於未匹配清單中，保障統計與研究誠信。
                </div>
              </div>
              <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="font-semibold text-slate-700 dark:text-slate-300">公開合法地圖來源聲明：</div>
                <div>• 底圖來源：OpenStreetMap 貢獻者、Esri World Light / Dark Gray Canvas、Esri World Imagery。</div>
                <div>• 視覺化引擎：MapLibre GL JS + Apache ECharts。</div>
                <div>• 資料持久化：瀏覽器 IndexedDB 本機儲存。</div>
              </div>
            </div>

            <div className="pt-1 text-right">
              <button
                onClick={() => setShowAboutModal(false)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-sky-600 dark:hover:bg-sky-500 rounded font-medium cursor-pointer"
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
