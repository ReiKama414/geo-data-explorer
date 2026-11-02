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

const controlClass =
  'toolbar-control-height w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs px-2.5 focus:outline-none focus:border-slate-900 dark:focus:border-sky-400';

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
    <div
      data-testid="filter-bar-container"
      className="w-full max-w-[calc(100vw-24px)] md:max-w-[620px] bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md dark:shadow-xl backdrop-blur-xs p-3 sm:p-3.5 text-xs text-slate-800 dark:text-slate-100 transition-colors"
    >
      <div className="toolbar-row">
        {/* Metric Selector */}
        <div className="toolbar-field flex-1 sm:min-w-[168px] sm:max-w-[220px]">
          <div className="flex items-end gap-2 min-w-0">
            <div className="toolbar-control-height flex w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-sky-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="toolbar-field-label text-slate-400 dark:text-slate-400">分析指標</span>
              <select
                value={selectedMetric}
                onChange={(e) => onSelectMetric(e.target.value)}
                className={`${controlClass} font-medium cursor-pointer truncate`}
              >
                {metricColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Region Search */}
        <div className="toolbar-field flex-1 sm:min-w-[160px]">
          <span className="toolbar-field-label text-slate-400 dark:text-slate-400">地區搜尋</span>
          <div className="relative toolbar-control-height">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="搜尋地區名稱或代碼..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`${controlClass} pl-8 pr-8 placeholder-slate-400`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer p-1 rounded"
                aria-label="清除搜尋"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Value Range Slider Filter */}
        {stats && stats.min !== stats.max && (
          <div className="toolbar-field flex-1 sm:min-w-[180px]">
            <div className="flex items-center justify-between gap-2 px-0.5 toolbar-field-label text-slate-500 dark:text-slate-400 normal-case font-semibold tracking-normal">
              <span className="truncate">門檻: {formatNumber(currentMin)}</span>
              <span className="truncate">上限: {formatNumber(currentMax)}</span>
            </div>
            <div className="toolbar-control-height flex items-center gap-2 px-0.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
                className="w-full min-w-0 h-1.5 bg-slate-200 dark:bg-slate-800 rounded appearance-none cursor-pointer accent-slate-900 dark:accent-sky-400"
                aria-label="數值門檻篩選"
              />
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            title="清除所有搜尋與範圍篩選"
            className="toolbar-control-height px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>重設篩選</span>
          </button>
        )}
      </div>
    </div>
  );
};
