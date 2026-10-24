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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                未匹配地區資料處理
                <span className="text-xs bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/30">
                  {unmatchedRows.length} 筆待處理
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                嚴格遵守地理資料真實性原則：<strong className="text-amber-300">絕不捏造或隨意推測經緯度座標</strong>。
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Guidance Banner */}
        <div className="p-3 bg-amber-950/30 border-b border-amber-800/40 text-xs text-amber-200 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              以下 CSV 資料的地區代碼在載入的 GeoJSON 檔案中找不到對應的多邊形幾何形狀。
            </p>
            <p className="text-amber-300/80 text-[11px]">
              您可以在此檢視完整欄位、匯出未匹配報告，或在下方將別名手動指派至既有地理區域。
            </p>
          </div>
        </div>

        {/* Content Body / Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {unmatchedRows.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-slate-200">所有 CSV 記錄皆已成功匹配至地理形狀！</p>
              <p className="text-xs text-slate-500 mt-1">無任何孤立或遺漏的地區數據。</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unmatchedRows.map((item, idx) => {
                const currentAlias = aliasMap[item.joinValue];
                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] font-bold">
                          列 #{item.originalIndex + 1}
                        </span>
                        <span className="font-mono text-amber-400 font-semibold text-sm">
                          鍵值: {item.joinValue}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 italic">{item.reason}</span>
                    </div>

                    {/* Raw Row Values Preview */}
                    <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800/80 overflow-x-auto font-mono text-[11px] text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                      {Object.entries(item.row).map(([k, v]) => (
                        <div key={k} className="flex gap-1">
                          <span className="text-slate-500">{k}:</span>
                          <span className="text-slate-200">{String(v)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Manual Alias Action */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900">
                      <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                        <span className="text-slate-400 text-[11px] flex items-center gap-1">
                          <Link2 className="w-3.5 h-3.5 text-sky-400" />
                          手動關聯至既有區域:
                        </span>
                        <select
                          value={selectedGeoTargets[item.joinValue] || currentAlias || ''}
                          onChange={(e) =>
                            setSelectedGeoTargets((prev) => ({
                              ...prev,
                              [item.joinValue]: e.target.value,
                            }))
                          }
                          className="bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-700 text-xs flex-1 focus:outline-none focus:border-sky-400"
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
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded font-medium text-xs transition-colors cursor-pointer"
                        >
                          套用關聯
                        </button>
                      </div>

                      {currentAlias && (
                        <button
                          onClick={() => onRemoveAlias(item.joinValue)}
                          className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
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
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <div className="text-slate-400 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>未匹配資料保留於資料表中，不影響已匹配區域的統計正確性。</span>
          </div>

          <div className="flex items-center gap-2">
            {unmatchedRows.length > 0 && (
              <button
                onClick={() => exportUnmatchedToCSV(unmatchedRows)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                匯出未匹配 CSV 報告
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg transition-colors cursor-pointer"
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
    <div className="bg-amber-950/70 border border-amber-600/50 rounded-xl px-3 py-2 flex items-center justify-between gap-3 shadow-lg backdrop-blur-md text-xs">
      <div className="flex items-center gap-2 text-amber-200">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          發現 <strong className="text-amber-300 font-mono font-bold">{unmatchedCount}</strong>{' '}
          筆 CSV 資料在地理圖資中無匹配邊界（<strong>未捏造虛假座標</strong>）
        </span>
      </div>
      <button
        onClick={onOpenModal}
        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-medium transition-colors cursor-pointer shrink-0"
      >
        檢視與關聯
      </button>
    </div>
  );
};
