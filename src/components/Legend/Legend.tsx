import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Sliders,
  Palette,
  ArrowUpDown,
  FilterX,
  Layers,
} from 'lucide-react';
import type { ClassificationMethod, LegendBreak, PaletteId } from '../../types';
import { COLOR_PALETTES } from '../../utils/colorScales';

interface LegendProps {
  breaks: LegendBreak[];
  metricName: string;
  classificationMethod: ClassificationMethod;
  onChangeMethod: (method: ClassificationMethod) => void;
  paletteId: PaletteId;
  onChangePalette: (palette: PaletteId) => void;
  paletteReversed: boolean;
  onToggleReversePalette: () => void;
  numClasses: number;
  onChangeNumClasses: (num: number) => void;
  selectedBreakIndex: number | null;
  onSelectBreak: (index: number | null) => void;
  unmatchedCount: number;
}

export const Legend: React.FC<LegendProps> = ({
  breaks,
  metricName,
  classificationMethod,
  onChangeMethod,
  paletteId,
  onChangePalette,
  paletteReversed,
  onToggleReversePalette,
  numClasses,
  onChangeNumClasses,
  selectedBreakIndex,
  onSelectBreak,
  unmatchedCount,
}) => {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 480
  );
  const [showSettings, setShowSettings] = useState(false);

  const methods: { id: ClassificationMethod; label: string; desc: string }[] = [
    { id: 'jenks', label: '自然間斷 (Jenks)', desc: '依資料群聚分群，極大化組間差異' },
    { id: 'quantile', label: '分位數 (Quantile)', desc: '各區間包含相同數量的地區' },
    { id: 'equalInterval', label: '等距分級 (Equal)', desc: '將最大值至最小值平均切分' },
    { id: 'logarithmic', label: '對數分級 (Log)', desc: '適合高度偏態分佈的資料' },
  ];

  return (
    <div
      data-testid="legend-container"
      className="w-full max-w-[calc(100vw-24px)] sm:w-72 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md dark:shadow-xl backdrop-blur-xs overflow-hidden text-xs text-slate-800 dark:text-slate-100 transition-colors"
    >
      {/* Legend Header */}
      <div className="p-2.5 sm:p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-950/40">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-sky-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
              分級設色圖例
            </span>
            <span
              data-testid="legend-metric-title"
              className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block"
            >
              {metricName || '未選擇指標'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowSettings(!showSettings)}
            title="調整分級方法與色盤"
            className={`p-1.5 rounded border transition-colors cursor-pointer ${
              showSettings
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? '展開圖例' : '收合圖例'}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Classification & Palette Settings Drawer */}
      {showSettings && (
        <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
          {/* Method */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">分級算法</label>
            <div className="grid grid-cols-2 gap-1">
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onChangeMethod(m.id)}
                  title={m.desc}
                  className={`px-2 py-1 text-left rounded text-[11px] font-medium transition-all cursor-pointer ${
                    classificationMethod === m.id
                      ? 'bg-slate-900 text-white dark:bg-sky-600 dark:text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Classes Count */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">分級數量</label>
              <span className="font-mono font-bold text-slate-900 dark:text-sky-400">{numClasses} 階</span>
            </div>
            <div className="flex gap-1">
              {[3, 4, 5, 6, 7, 8].map((n) => (
                <button
                  key={n}
                  onClick={() => onChangeNumClasses(n)}
                  className={`flex-1 py-1 rounded text-center font-mono text-[11px] transition-colors cursor-pointer ${
                    numClasses === n
                      ? 'bg-slate-900 text-white dark:bg-sky-600 font-bold'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Palette Choice */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Palette className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                色彩配置
              </label>
              <button
                onClick={onToggleReversePalette}
                title="反轉色階方向"
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                  paletteReversed
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <ArrowUpDown className="w-2.5 h-2.5" />
                反轉
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(Object.keys(COLOR_PALETTES) as PaletteId[]).map((pId) => {
                const pal = COLOR_PALETTES[pId];
                const active = paletteId === pId;
                return (
                  <button
                    key={pId}
                    onClick={() => onChangePalette(pId)}
                    className={`p-1 rounded border text-left transition-all cursor-pointer ${
                      active
                        ? 'border-slate-900 bg-slate-100 dark:border-sky-400 dark:bg-sky-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="h-2 w-full rounded flex overflow-hidden mb-0.5">
                      {pal.colors.map((c, i) => (
                        <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="text-[9px] text-slate-600 dark:text-slate-300 truncate">{pal.name.split(' ')[0]}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Legend Body */}
      {!collapsed && (
        <div className="p-2 sm:p-2.5 space-y-1 text-xs">
          {/* Active break filter reset */}
          {selectedBreakIndex !== null && (
            <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-700 dark:text-sky-400 font-medium">
                已篩選第 {selectedBreakIndex + 1} 階區間
              </span>
              <button
                onClick={() => onSelectBreak(null)}
                className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-amber-300 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer"
              >
                <FilterX className="w-3 h-3" />
                重設
              </button>
            </div>
          )}

          {/* Color Interval List */}
          <div className="space-y-0.5">
            {breaks.map((b, idx) => {
              const isSelected = selectedBreakIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => onSelectBreak(isSelected ? null : idx)}
                  title={`點選以單獨篩選此區間 (${b.count} 個地區)`}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded border transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-slate-100 border-slate-800 text-slate-900 font-semibold dark:bg-sky-500/20 dark:border-sky-400 dark:text-sky-200'
                      : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-sm shadow-xs border border-black/20 shrink-0"
                      style={{ backgroundColor: b.color }}
                    />
                    <span className="font-mono text-[11px] truncate">{b.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded shrink-0">
                    {b.count}
                  </span>
                </button>
              );
            })}

            {/* No Data / Unmatched swatch */}
            {unmatchedCount > 0 && (
              <div className="flex items-center justify-between px-2 py-1 rounded text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-sm bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 shrink-0" />
                  <span>無資料 / 未匹配幾何</span>
                </div>
                <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">{unmatchedCount} 區</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
