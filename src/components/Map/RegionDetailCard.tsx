import React from 'react';
import { X, Trophy, Layers, CheckCircle, AlertTriangle } from 'lucide-react';
import type { CustomFeature } from '../../types';
import { formatNumber } from '../../utils/colorScales';

interface RegionDetailCardProps {
  feature: CustomFeature | null;
  metricColumn: string;
  onClose: () => void;
}

export const RegionDetailCard: React.FC<RegionDetailCardProps> = ({
  feature,
  metricColumn,
  onClose,
}) => {
  if (!feature) return null;

  const props = feature.properties || {};
  const isMatched = props._matched === true;
  const regionName = props._regionName || '未命名區域';
  const joinKey = props._joinKey || '-';
  const metricVal = props._metricValue;
  const rank = props._rank;
  const rankTotal = props._rankTotal;
  const percentile = props._percentile;

  // Collect other numerical / textual properties
  const otherAttributes: Array<{ key: string; value: any }> = [];
  Object.entries(props).forEach(([k, v]) => {
    if (!k.startsWith('_') && k !== metricColumn) {
      otherAttributes.push({ key: k, value: v });
    }
  });

  return (
    <div
      data-testid="region-detail-container"
      className="w-full max-w-[calc(100vw-24px)] sm:w-88 max-h-[85vh] bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-xl shadow-md dark:shadow-xl flex flex-col overflow-hidden text-xs text-slate-800 dark:text-slate-100 transition-colors"
    >
      {/* 1. Header (Normal Document Flow) */}
      <div className="p-2 sm:p-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/70 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded bg-sky-500/10 text-slate-700 dark:text-sky-400 shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">{regionName}</h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate block">代碼: {joinKey}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          title="取消選取並關閉詳情"
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Main Metric Focus Card (Normal Document Flow) */}
      <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5 shrink-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium truncate">{metricColumn}</span>
          {isMatched ? (
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-1.5 py-0.2 rounded flex items-center gap-1 font-semibold shrink-0">
              <CheckCircle className="w-3 h-3" /> 已匹配
            </span>
          ) : (
            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-1.5 py-0.2 rounded flex items-center gap-1 font-semibold shrink-0">
              <AlertTriangle className="w-3 h-3" /> 無數據
            </span>
          )}
        </div>

        <div className="text-2xl font-black font-mono text-slate-900 dark:text-sky-400">
          {typeof metricVal === 'number' ? formatNumber(metricVal) : '無此數值'}
        </div>

        {rank && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-500" /> 全區排名
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">
              第 <strong className="text-amber-600 dark:text-amber-400">{rank}</strong> 名 / 共 {rankTotal} (前 {percentile}%)
            </span>
          </div>
        )}
      </div>

      {/* 3. Other Attributes List (Natural Flex Overflow) */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
          完整屬性欄位 ({otherAttributes.length})
        </div>
        {otherAttributes.length === 0 ? (
          <div className="text-slate-400 italic py-2">無其他屬性</div>
        ) : (
          otherAttributes.map(({ key, value }) => (
            <div
              key={key}
              className="p-1.5 bg-slate-50 dark:bg-slate-950/60 rounded flex items-center justify-between border border-slate-100 dark:border-slate-800/60 gap-2"
            >
              <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px] truncate">{key}</span>
              <span className="text-slate-900 dark:text-slate-200 font-mono text-[11px] font-semibold text-right truncate">
                {typeof value === 'number' ? formatNumber(value) : String(value ?? '-')}
              </span>
            </div>
          ))
        )}
      </div>

      {/* 4. Footer info */}
      <div className="p-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
        已選取特定分區 • 點選地圖空白處或右上角關閉
      </div>
    </div>
  );
};
