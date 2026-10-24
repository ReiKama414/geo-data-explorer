import React from 'react';
import { Search, BarChart3, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { MetricStatistics } from '../../types';
import { formatNumber } from '../../utils/colorScales';

interface FilterBarProps {
  metricColumns: string[];
  selectedMetric: string;
  onSelectMetric: (metric: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  rangeFilter: [number, number] | null;
  onRangeFilterChange: (range: [number, number] | null) => void;
  stats: MetricStatistics | null;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  metricColumns,
  selectedMetric,
  onSelectMetric,
  searchQuery,
  onSearchChange,
  rangeFilter,
  onRangeFilterChange,
  stats,
}) => {
  const minVal = stats ? stats.min : 0;
  const maxVal = stats ? stats.max : 100;

  const currentMin = rangeFilter ? rangeFilter[0] : minVal;
  const currentMax = rangeFilter ? rangeFilter[1] : maxVal;

  const hasActiveFilters = Boolean(searchQuery.trim() || rangeFilter);

  const resetFilters = () => {
    onSearchChange('');
    onRangeFilterChange(null);
  };

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md p-3 flex flex-wrap items-center gap-3">
      {/* Metric Selector */}
      <div className="flex items-center gap-2 min-w-[220px] flex-1">
        <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 shrink-0">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            分析指標
          </label>
          <select
            value={selectedMetric}
            onChange={(e) => onSelectMetric(e.target.value)}
            className="w-full bg-slate-800 text-slate-100 font-semibold text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            {metricColumns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Region Search */}
      <div className="relative min-w-[180px] flex-1">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="搜尋地區名稱或代碼..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-slate-800 text-slate-100 text-xs rounded-lg pl-8 pr-3 py-2 border border-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-400"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Value Range Slider Filter */}
      {stats && stats.min !== stats.max && (
        <div className="flex items-center gap-2 min-w-[200px] flex-1 text-xs">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>門檻: {formatNumber(currentMin)}</span>
              <span>上限: {formatNumber(currentMax)}</span>
            </div>
            <input
              type="range"
              min={minVal}
              max={maxVal}
              step={(maxVal - minVal) / 100 || 1}
              value={currentMin}
              onChange={(e) => {
                const val = Number(e.target.value);
                onRangeFilterChange([val, currentMax]);
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>
        </div>
      )}

      {/* Reset Filter Button */}
      {hasActiveFilters && (
        <button
          onClick={resetFilters}
          title="清除所有搜尋與範圍篩選"
          className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          重設篩選
        </button>
      )}
    </div>
  );
};
