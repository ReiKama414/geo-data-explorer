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
        className="bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center gap-2 cursor-pointer transition-all"
        title="展開區域排名榜"
      >
        <Trophy className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-bold">區域排名</span>
        <ChevronLeft className="w-4 h-4 text-slate-400" />
      </button>
    );
  }

  return (
    <div className="w-80 max-h-[85vh] bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col overflow-hidden text-xs">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-xs">區域排名榜</h3>
            <span className="text-[10px] text-slate-400 truncate block max-w-[150px]">
              {metricColumn}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsAscending(!isAscending)}
            title={isAscending ? '改為由大到小排序' : '改為由小到大排序'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isAscending ? (
              <ArrowUpWideNarrow className="w-4 h-4 text-sky-400" />
            ) : (
              <ArrowDownNarrowWide className="w-4 h-4 text-sky-400" />
            )}
          </button>
          <button
            onClick={() => setCollapsed(true)}
            title="收合排名榜"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Mini Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-950/60 border-b border-slate-800 text-[11px]">
          <div className="p-2 bg-slate-900/80 border border-slate-800 rounded-lg">
            <span className="text-slate-400 block text-[10px] flex items-center gap-1">
              <Calculator className="w-3 h-3 text-sky-400" /> 平均值
            </span>
            <span className="font-bold text-slate-200 font-mono">{formatNumber(stats.mean)}</span>
          </div>
          <div className="p-2 bg-slate-900/80 border border-slate-800 rounded-lg">
            <span className="text-slate-400 block text-[10px] flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" /> 中位數
            </span>
            <span className="font-bold text-slate-200 font-mono">{formatNumber(stats.median)}</span>
          </div>
        </div>
      )}

      {/* Ranked List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-1">
        {rankedItems.length === 0 ? (
          <div className="p-4 text-center text-slate-500">無已匹配之指標數據</div>
        ) : (
          rankedItems.map((item, idx) => {
            const isSelected = item.id === selectedRegionId;
            const barPct = Math.max(5, Math.min(100, ((item.value - minVal) / range) * 100));

            return (
              <button
                key={item.id}
                onClick={() => onSelectRegion(isSelected ? null : item.id)}
                className={`w-full p-2 rounded-xl text-left transition-all relative overflow-hidden group cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border border-amber-400/50 shadow-inner'
                    : 'hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {/* Background value gauge bar */}
                <div
                  className="absolute left-0 bottom-0 top-0 bg-sky-500/10 pointer-events-none transition-all duration-300"
                  style={{ width: `${barPct}%` }}
                />

                <div className="relative z-10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    {/* Rank Icon / Number */}
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] font-mono shrink-0 ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950 font-black'
                          : idx === 2
                          ? 'bg-amber-700 text-amber-100 font-black'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <span className="font-semibold text-slate-200 block truncate group-hover:text-white">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{item.code}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-sky-400 font-mono text-xs block">
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
      <div className="p-2 border-t border-slate-800 text-[10px] text-slate-400 text-center bg-slate-950/40">
        共 {rankedItems.length} 個地區 • 點擊可於地圖定位
      </div>
    </div>
  );
};
