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
    <div className="absolute top-4 left-4 z-20 w-80 max-h-[80vh] bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col overflow-hidden text-xs animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
        <div className="flex items-center gap-2 truncate">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h3 className="font-bold text-slate-100 text-sm truncate">{regionName}</h3>
            <span className="text-[10px] text-slate-400 font-mono">代碼: {joinKey}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Metric Focus Card */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/30 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">{metricColumn}</span>
          {isMatched ? (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> 已匹配
            </span>
          ) : (
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> 無數據
            </span>
          )}
        </div>

        <div className="text-2xl font-black font-mono text-sky-400">
          {typeof metricVal === 'number' ? formatNumber(metricVal) : '無此數值'}
        </div>

        {rank && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> 全區排名
            </span>
            <span className="font-bold text-slate-200">
              第 <strong className="text-amber-400">{rank}</strong> 名 / 共 {rankTotal} (前 {percentile}%)
            </span>
          </div>
        )}
      </div>

      {/* Other Attributes List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
          完整屬性欄位 ({otherAttributes.length})
        </div>
        {otherAttributes.length === 0 ? (
          <div className="text-slate-500 italic py-2">無其他屬性</div>
        ) : (
          otherAttributes.map(({ key, value }) => (
            <div
              key={key}
              className="p-1.5 bg-slate-950/60 rounded-lg flex items-center justify-between border border-slate-800/60 gap-2"
            >
              <span className="text-slate-400 font-mono text-[11px] truncate">{key}</span>
              <span className="text-slate-200 font-mono text-[11px] font-semibold text-right truncate">
                {typeof value === 'number' ? formatNumber(value) : String(value ?? '-')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
