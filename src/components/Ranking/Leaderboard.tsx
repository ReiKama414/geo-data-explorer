import React, { useState, useMemo } from 'react';
import {
  Trophy,
  ArrowDownNarrowWide,
  ArrowUpWideNarrow,
  ChevronRight,
  ChevronLeft,
  Activity,
  Calculator,
} from 'lucide-react';
import type { CustomFeatureCollection, MetricStatistics } from '../../types';
import { formatNumber } from '../../utils/colorScales';

interface LeaderboardProps {
  geojson: CustomFeatureCollection;
  metricColumn: string;
  stats: MetricStatistics | null;
  selectedRegionId: string | number | null;
  onSelectRegion: (id: string | number | null) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  geojson,
  metricColumn,
  stats,
  selectedRegionId,
  onSelectRegion,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isAscending, setIsAscending] = useState(false);

  // Extract and rank items
  const rankedItems = useMemo(() => {
    const list: Array<{
      id: string | number;
      name: string;
      code: string;
      value: number;
      rawFeature: any;
    }> = [];

    geojson.features.forEach((feat, idx) => {
      const props = feat.properties || {};
      const val = props._metricValue;
      if (props._matched && typeof val === 'number') {
        const idKey = feat.properties._idKey || feat.id || idx;
        list.push({
          id: idKey,
          name: props._regionName,
          code: props._joinKey,
          value: val,
          rawFeature: feat,
        });
      }
    });

    list.sort((a, b) => (isAscending ? a.value - b.value : b.value - a.value));
    return list;
  }, [geojson, isAscending]);

  const maxVal = stats ? stats.max : 1;
  const minVal = stats ? stats.min : 0;
  const range = maxVal - minVal || 1;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg p-2 shadow-sm flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        title="展開區域排名榜"
      >
        <Trophy className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-semibold">區域排名</span>
        <ChevronLeft className="w-4 h-4 text-slate-400" />
      </button>
    );
  }

  return (
    <div
      data-testid="leaderboard-card-container"
      className="w-full max-w-[calc(100vw-24px)] sm:w-80 max-h-[85vh] bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-xl shadow-md dark:shadow-xl flex flex-col overflow-hidden text-xs text-slate-800 dark:text-slate-100 transition-colors"
    >
      {/* Header */}
      <div className="p-2 sm:p-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/70">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <Trophy className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">區域排名榜</h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block">
              {metricColumn}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsAscending(!isAscending)}
            title={isAscending ? '改為由大到小排序' : '改為由小到大排序'}
            className="p-1 rounded text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isAscending ? (
              <ArrowUpWideNarrow className="w-3.5 h-3.5" />
            ) : (
              <ArrowDownNarrowWide className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => setCollapsed(true)}
            title="收合排名榜"
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Mini Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-50/50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 text-[11px]">
          <div className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] flex items-center gap-1">
              <Calculator className="w-3 h-3 text-sky-600 dark:text-sky-400" /> 平均值
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-200 font-mono">{formatNumber(stats.mean)}</span>
          </div>
          <div className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> 中位數
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-200 font-mono">{formatNumber(stats.median)}</span>
          </div>
        </div>
      )}

      {/* Ranked List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
        {rankedItems.length === 0 ? (
          <div className="p-4 text-center text-slate-400">無已匹配之指標數據</div>
        ) : (
          rankedItems.map((item, idx) => {
            const isSelected = item.id === selectedRegionId;
            const barPct = Math.max(5, Math.min(100, ((item.value - minVal) / range) * 100));

            return (
              <button
                key={item.id}
                onClick={() => onSelectRegion(isSelected ? null : item.id)}
                className={`w-full p-2 rounded-lg text-left transition-all relative overflow-hidden group cursor-pointer ${
                  isSelected
                    ? 'bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-400/50 shadow-inner'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {/* Background value gauge bar */}
                <div
                  className="absolute left-0 bottom-0 top-0 bg-slate-900/5 dark:bg-sky-500/10 pointer-events-none transition-all duration-300"
                  style={{ width: `${barPct}%` }}
                />

                <div className="relative z-10 flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* Rank Icon / Number */}
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[9px] font-mono shrink-0 ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950 font-black'
                          : idx === 2
                          ? 'bg-amber-700 text-white font-black'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate group-hover:text-slate-950 dark:group-hover:text-white">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono truncate block">{item.code}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900 dark:text-sky-400 font-mono text-xs block">
                      {formatNumber(item.value)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer info */}
      <div className="p-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center bg-slate-50/50 dark:bg-slate-950/40">
        共 {rankedItems.length} 個地區 • 點選於地圖定位
      </div>
    </div>
  );
};
