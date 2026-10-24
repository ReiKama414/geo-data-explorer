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
  const [collapsed, setCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const methods: { id: ClassificationMethod; label: string; desc: string }[] = [
    { id: 'jenks', label: '自然間斷 (Jenks)', desc: '依資料群聚分群，極大化組間差異' },
    { id: 'quantile', label: '分位數 (Quantile)', desc: '各區間包含相同數量的地區' },
    { id: 'equalInterval', label: '等距分級 (Equal)', desc: '將最大值至最小值平均切分' },
    { id: 'logarithmic', label: '對數分級 (Log)', desc: '適合高度偏態分佈的資料' },
  ];

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden transition-all duration-200">
      {/* Legend Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <Layers className="w-4 h-4 text-sky-400 shrink-0" />
          <div className="truncate">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
              分級設色圖例
            </span>
            <span className="text-xs font-bold text-slate-100 truncate block">
              {metricName || '未選擇指標'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            title="調整分級方法與色盤"
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              showSettings
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? '展開圖例' : '收合圖例'}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Classification & Palette Settings Drawer */}
      {showSettings && (
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 space-y-3 text-xs">
          {/* Method */}
          <div>
            <label className="text-[11px] font-medium text-slate-400 mb-1 block">分級算法</label>
            <div className="grid grid-cols-2 gap-1.5">
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onChangeMethod(m.id)}
                  title={m.desc}
                  className={`px-2 py-1.5 text-left rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                    classificationMethod === m.id
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
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
              <label className="text-[11px] font-medium text-slate-400">分級數量</label>
              <span className="text-sky-400 font-bold font-mono">{numClasses} 階</span>
            </div>
            <div className="flex gap-1">
              {[3, 4, 5, 6, 7, 8].map((n) => (
                <button
                  key={n}
                  onClick={() => onChangeNumClasses(n)}
                  className={`flex-1 py-1 rounded text-center font-mono text-[11px] transition-colors cursor-pointer ${
                    numClasses === n
                      ? 'bg-sky-500 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
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
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <Palette className="w-3 h-3 text-purple-400" />
                色彩配置
              </label>
              <button
                onClick={onToggleReversePalette}
                title="反轉色階方向"
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                  paletteReversed
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <ArrowUpDown className="w-2.5 h-2.5" />
                反轉
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(COLOR_PALETTES) as PaletteId[]).map((pId) => {
                const pal = COLOR_PALETTES[pId];
                const active = paletteId === pId;
                return (
                  <button
                    key={pId}
                    onClick={() => onChangePalette(pId)}
                    className={`p-1 rounded-lg border text-left transition-all cursor-pointer ${
                      active
                        ? 'border-sky-400 bg-sky-500/10 shadow-sm'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-800/40'
                    }`}
                  >
                    <div className="h-2 w-full rounded flex overflow-hidden mb-1">
                      {pal.colors.map((c, i) => (
                        <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="text-[10px] text-slate-300 truncate">{pal.name.split(' ')[0]}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Legend Body */}
      {!collapsed && (
        <div className="p-3 space-y-1.5 text-xs">
          {/* Active break filter reset */}
          {selectedBreakIndex !== null && (
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-800">
              <span className="text-[11px] text-sky-400 flex items-center gap-1">
                <span>已篩選第 {selectedBreakIndex + 1} 階區間</span>
              </span>
              <button
                onClick={() => onSelectBreak(null)}
                className="text-[10px] text-slate-400 hover:text-amber-300 flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <FilterX className="w-3 h-3" />
                重設
              </button>
            </div>
          )}

          {/* Color Interval List */}
          <div className="space-y-1">
            {breaks.map((b, idx) => {
              const isSelected = selectedBreakIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => onSelectBreak(isSelected ? null : idx)}
                  title={`點選以單獨篩選此區間 (${b.count} 個地區)`}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded-lg border transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200 ring-1 ring-sky-400'
                      : 'border-transparent hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded shadow-sm border border-black/30 shrink-0"
                      style={{ backgroundColor: b.color }}
                    />
                    <span className="font-mono text-[11px] font-medium">{b.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded-full">
                    {b.count}
                  </span>
                </button>
              );
            })}

            {/* No Data / Unmatched swatch */}
            {unmatchedCount > 0 && (
              <div className="flex items-center justify-between px-2 py-1 rounded-lg text-slate-400 border border-dashed border-slate-800 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-slate-700/80 border border-slate-600 shrink-0" />
                  <span>無資料 / 未匹配幾何</span>
                </div>
                <span className="font-mono text-[10px] text-amber-400/90">{unmatchedCount} 區</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
