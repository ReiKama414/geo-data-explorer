import React, { useState } from 'react';
import {
  AlertTriangle,
  Download,
  Link2,
  X,
  CheckCircle,
  HelpCircle,
  Info,
} from 'lucide-react';
import type { UnmatchedCsvRecord, CustomFeatureCollection } from '../../types';
import { exportUnmatchedToCSV } from '../../utils/exportUtils';

interface UnmatchedMapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  unmatchedRows: UnmatchedCsvRecord[];
  geojson: CustomFeatureCollection;
  geoKey: string;
  aliasMap: Record<string, string>;
  onUpdateAlias: (csvKeyVal: string, targetGeoKeyVal: string) => void;
  onRemoveAlias: (csvKeyVal: string) => void;
}

export const UnmatchedMapperModal: React.FC<UnmatchedMapperModalProps> = ({
  isOpen,
  onClose,
  unmatchedRows,
  geojson,
  geoKey,
  aliasMap,
  onUpdateAlias,
  onRemoveAlias,
}) => {
  const [selectedGeoTargets, setSelectedGeoTargets] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  // Available GeoJSON regions for manual mapping
  const availableGeoOptions = geojson.features.map((f, idx) => {
    const props = f.properties || {};
    const keyVal = String(props[geoKey] || f.id || idx);
    const name = String(props._regionName || props.name || props.COUNTYNAME || keyVal);
    return { keyVal, name };
  });

  const handleApplyMapping = (csvJoinVal: string) => {
    const target = selectedGeoTargets[csvJoinVal];
    if (target) {
      onUpdateAlias(csvJoinVal, target);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-w-[calc(100vw-16px)] sm:max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-xs text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                <span>未匹配地區資料處理</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono px-2 py-0.2 rounded-full border border-amber-500/30">
                  {unmatchedRows.length} 筆
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                嚴格遵守地理真實性：<strong className="text-amber-600 dark:text-amber-300">絕不捏造或隨意推測經緯度座標</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Guidance Banner */}
        <div className="p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0">
            <p className="font-medium">
              以下 CSV 資料的地區代碼在載入的 GeoJSON 檔案中找不到對應的多邊形幾何形狀。
            </p>
            <p className="text-amber-700 dark:text-amber-300/80 text-[11px]">
              資料完整留存於此，您可手動指派別名關聯至既有區域，或匯出未匹配 CSV 報告。
            </p>
          </div>
        </div>

        {/* Content Body / List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {unmatchedRows.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-slate-800 dark:text-slate-200">所有 CSV 記錄皆已成功匹配至地理多邊形！</p>
              <p className="text-xs text-slate-500 mt-1">無任何孤立或遺漏的地區數據。</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {unmatchedRows.map((item, idx) => {
                const currentAlias = aliasMap[item.joinValue];
                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          列 #{item.originalIndex + 1}
                        </span>
                        <span className="font-mono text-amber-700 dark:text-amber-400 font-semibold text-xs">
                          鍵值: {item.joinValue}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 italic break-all">
                        {item.reason}
                      </span>
                    </div>

                    {/* Raw Row Values Preview */}
                    <div className="bg-white dark:bg-slate-900 rounded p-2 border border-slate-200 dark:border-slate-800 overflow-x-auto font-mono text-[11px] text-slate-700 dark:text-slate-300 flex flex-wrap gap-x-3 gap-y-1">
                      {Object.entries(item.row).map(([k, v]) => (
                        <div key={k} className="flex gap-1">
                          <span className="text-slate-400">{k}:</span>
                          <span className="font-semibold">{String(v)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Manual Alias Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-900">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                          <Link2 className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                          手動關聯:
                        </span>
                        <select
                          value={selectedGeoTargets[item.joinValue] || currentAlias || ''}
                          onChange={(e) =>
                            setSelectedGeoTargets((prev) => ({
                              ...prev,
                              [item.joinValue]: e.target.value,
                            }))
                          }
                          className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded px-2 py-1 border border-slate-300 dark:border-slate-700 text-xs flex-1 min-w-0 focus:outline-none"
                        >
                          <option value="">-- 保持未匹配 (不捏造座標) --</option>
                          {availableGeoOptions.map((opt) => (
                            <option key={opt.keyVal} value={opt.keyVal}>
                              {opt.name} ({opt.keyVal})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleApplyMapping(item.joinValue)}
                          disabled={!selectedGeoTargets[item.joinValue]}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white dark:bg-sky-600 dark:hover:bg-sky-500 disabled:opacity-40 rounded text-xs transition-colors cursor-pointer shrink-0"
                        >
                          套用
                        </button>
                      </div>

                      {currentAlias && (
                        <button
                          onClick={() => onRemoveAlias(item.joinValue)}
                          className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                        >
                          解除手動關聯
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-[11px] text-center sm:text-left">
            <HelpCircle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>未匹配資料保留於資料表中，不影響已匹配區域的統計正確性。</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {unmatchedRows.length > 0 && (
              <button
                onClick={() => exportUnmatchedToCSV(unmatchedRows)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded flex items-center gap-1 transition-colors cursor-pointer text-xs"
              >
                <Download className="w-3.5 h-3.5 text-amber-500" />
                匯出未匹配 CSV
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-sky-600 dark:hover:bg-sky-500 rounded transition-colors cursor-pointer text-xs"
            >
              完成關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const UnmatchedBanner: React.FC<{
  unmatchedCount: number;
  onOpenModal: () => void;
}> = ({ unmatchedCount, onOpenModal }) => {
  if (unmatchedCount === 0) return null;

  return (
    <div className="w-full max-w-[calc(100vw-24px)] md:max-w-[620px] bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-600/50 rounded-xl px-3 sm:px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs text-xs">
      <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-200 min-w-0 pr-1">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="truncate">
          發現 <strong className="font-mono font-bold text-amber-900 dark:text-amber-300">{unmatchedCount}</strong>{' '}
          筆 CSV 資料在圖資中無匹配邊界（<strong>未捏造虛假座標</strong>）
        </span>
      </div>
      <button
        onClick={onOpenModal}
        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:text-amber-300 dark:border dark:border-amber-500/40 rounded font-medium transition-colors cursor-pointer shrink-0 text-xs"
      >
        檢視與關聯
      </button>
    </div>
  );
};
