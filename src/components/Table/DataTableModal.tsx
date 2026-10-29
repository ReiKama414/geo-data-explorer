import React, { useState, useMemo } from 'react';
import {
  Table as TableIcon,
  X,
  Search,
  Download,
  ArrowUpDown,
  AlertTriangle,
  MapPinOff,
  CheckCircle2,
} from 'lucide-react';
import type {
  CustomFeatureCollection,
  UnmatchedCsvRecord,
  UnmatchedGeoRecord,
} from '../../types';
import { exportFeaturesToCSV, exportUnmatchedToCSV } from '../../utils/exportUtils';
import { formatNumber } from '../../utils/colorScales';

interface DataTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  geojson: CustomFeatureCollection;
  unmatchedCsv: UnmatchedCsvRecord[];
  unmatchedGeo: UnmatchedGeoRecord[];
  metricColumn: string;
  selectedRegionId: string | number | null;
  onSelectRegion: (id: string | number | null) => void;
}

export const DataTableModal: React.FC<DataTableModalProps> = ({
  isOpen,
  onClose,
  geojson,
  unmatchedCsv,
  unmatchedGeo,
  metricColumn,
  selectedRegionId,
  onSelectRegion,
}) => {
  const [activeTab, setActiveTab] = useState<'merged' | 'unmatchedCsv' | 'unmatchedGeo'>('merged');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<string>('_rank');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  // Extract columns for merged tab
  const mergedColumns = useMemo(() => {
    const cols = new Set<string>();
    cols.add('排名');
    cols.add('地區名稱');
    cols.add('代碼');
    cols.add(metricColumn);

    // Add other properties
    geojson.features.slice(0, 30).forEach((f) => {
      Object.keys(f.properties || {}).forEach((k) => {
        if (!k.startsWith('_') && k !== metricColumn) {
          cols.add(k);
        }
      });
    });

    return Array.from(cols);
  }, [geojson, metricColumn]);

  // Process rows for merged tab
  const mergedRows = useMemo(() => {
    return geojson.features.map((f, idx) => {
      const p = f.properties || {};
      const idKey = p._idKey || f.id || idx;
      return {
        idKey,
        _matched: p._matched,
        排名: p._rank ?? 999999,
        地區名稱: p._regionName || '未命名',
        代碼: p._joinKey || '-',
        [metricColumn]: p._metricValue,
        rawProps: p,
      };
    });
  }, [geojson, metricColumn]);

  // Filter and sort merged rows
  const filteredMergedRows = useMemo(() => {
    let rows = [...mergedRows];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => {
        return (
          String(r.地區名稱).toLowerCase().includes(q) ||
          String(r.代碼).toLowerCase().includes(q) ||
          Object.values(r.rawProps).some((v) => String(v).toLowerCase().includes(q))
        );
      });
    }

    rows.sort((a: any, b: any) => {
      const valA = a[sortField] !== undefined ? a[sortField] : a.rawProps[sortField];
      const valB = b[sortField] !== undefined ? b[sortField] : b.rawProps[sortField];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return rows;
  }, [mergedRows, search, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredMergedRows.length / pageSize));
  const paginatedRows = filteredMergedRows.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (col: string) => {
    if (sortField === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(col);
      setSortAsc(col === '排名' ? true : false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] sm:h-[90vh] flex flex-col overflow-hidden text-xs text-slate-800 dark:text-slate-100 transition-colors">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-sky-500/10 text-slate-700 dark:text-sky-400">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">資料總表與匹配診斷</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">檢視已匹配空間資料、未匹配記錄及無數據區域</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="p-2.5 sm:p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-2.5">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-xl overflow-x-auto max-w-full">
            <button
              onClick={() => {
                setActiveTab('merged');
                setPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-xs ${
                activeTab === 'merged'
                  ? 'bg-slate-900 dark:bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              已合併空間資料 ({mergedRows.length})
            </button>

            <button
              onClick={() => {
                setActiveTab('unmatchedCsv');
                setPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-xs ${
                activeTab === 'unmatchedCsv'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-amber-600 dark:text-amber-400/90 hover:text-amber-700 dark:hover:text-amber-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              未匹配 CSV 資料 ({unmatchedCsv.length})
            </button>

            <button
              onClick={() => {
                setActiveTab('unmatchedGeo');
                setPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-xs ${
                activeTab === 'unmatchedGeo'
                  ? 'bg-slate-600 dark:bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MapPinOff className="w-3.5 h-3.5" />
              無資料區域 ({unmatchedGeo.length})
            </button>
          </div>

          {/* Search & Export */}
          <div className="flex items-center gap-2">
            {activeTab === 'merged' && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜尋表格內容..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:border-slate-900 dark:focus:border-sky-400 w-36 sm:w-48"
                />
              </div>
            )}

            {activeTab === 'merged' ? (
              <button
                onClick={() => exportFeaturesToCSV(geojson.features)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600 dark:text-sky-400" />
                <span className="hidden sm:inline">匯出</span> CSV
              </button>
            ) : activeTab === 'unmatchedCsv' ? (
              <button
                onClick={() => exportUnmatchedToCSV(unmatchedCsv)}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/40 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                匯出未匹配名冊
              </button>
            ) : null}
          </div>
        </div>

        {/* Tab 1: Merged Data Table */}
        {activeTab === 'merged' && (
          <div className="flex-1 overflow-auto min-w-0 w-full">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-950/90 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                <tr>
                  {mergedColumns.map((col) => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className="p-3 font-semibold hover:text-slate-900 dark:hover:text-white cursor-pointer select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>{col}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      </div>
                    </th>
                  ))}
                  <th className="p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={mergedColumns.length + 1} className="p-8 text-center text-slate-400">
                      無符合條件的資料
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => {
                    const isSelected = row.idKey === selectedRegionId;
                    return (
                      <tr
                        key={row.idKey}
                        onClick={() => onSelectRegion(isSelected ? null : row.idKey)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-100 dark:bg-sky-500/15 border-l-4 border-l-slate-900 dark:border-l-amber-400'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {mergedColumns.map((col) => {
                          let val: any;
                          if (col === '排名') {
                            val =
                              row.排名 === 999999 ? (
                                <span className="text-slate-400">-</span>
                              ) : (
                                <span className="font-bold text-amber-600 dark:text-amber-400">#{row.排名}</span>
                              );
                          } else if (col === '地區名稱') {
                            val = <span className="font-sans font-semibold text-slate-900 dark:text-slate-200">{row.地區名稱}</span>;
                          } else if (col === '代碼') {
                            val = <span className="text-slate-500 dark:text-slate-400">{row.代碼}</span>;
                          } else if (col === metricColumn) {
                            const raw = row[metricColumn];
                            val =
                              typeof raw === 'number' ? (
                                <span className="font-bold text-slate-900 dark:text-sky-400">{formatNumber(raw)}</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              );
                          } else {
                            const raw = row.rawProps[col];
                            val = typeof raw === 'number' ? formatNumber(raw) : String(raw ?? '-');
                          }

                          return (
                            <td key={col} className="p-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {val}
                            </td>
                          );
                        })}

                        <td className="p-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectRegion(row.idKey);
                              onClose();
                            }}
                            className="px-2 py-1 bg-slate-100 dark:bg-sky-500/20 hover:bg-slate-200 dark:hover:bg-sky-500/30 text-slate-800 dark:text-sky-300 rounded text-[11px] font-sans transition-colors cursor-pointer"
                          >
                            定位
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Unmatched CSV Records */}
        {activeTab === 'unmatchedCsv' && (
          <div className="flex-1 overflow-auto p-4 space-y-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-amber-800 dark:text-amber-300">
                  堅持地理真實性：未匹配記錄絕不捏造或隨機填補經緯度
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-1">
                  下列 CSV 記錄因地區代碼在 GeoJSON 中找不到幾何多邊形，已被完整保留於獨立報表中。
                </p>
              </div>
            </div>

            {unmatchedCsv.length === 0 ? (
              <div className="p-8 text-center text-slate-400">太棒了！無任何無法匹配之 CSV 記錄。</div>
            ) : (
              <div className="space-y-2">
                {unmatchedCsv.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded font-bold">
                          列 #{item.originalIndex + 1}
                        </span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                          未匹配鍵值: {item.joinValue}
                        </span>
                      </div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">{item.reason}</span>
                    </div>

                    <div className="bg-white dark:bg-slate-900/80 p-2 rounded-lg font-mono text-[11px] text-slate-700 dark:text-slate-300 flex flex-wrap gap-x-4 gap-y-1 border border-slate-200 dark:border-slate-800">
                      {Object.entries(item.row).map(([k, v]) => (
                        <span key={k}>
                          <span className="text-slate-400">{k}:</span> {String(v)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Unmapped Geographies */}
        {activeTab === 'unmatchedGeo' && (
          <div className="flex-1 overflow-auto p-4 space-y-3">
            <div className="p-3 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
              <MapPinOff className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  存在於 GeoJSON 向量圖資，但在本期 CSV 中未包含數據的地區
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  在地圖上以中性灰色網底呈現，確保地圖空間輪廓完整且數據忠實呈現。
                </p>
              </div>
            </div>

            {unmatchedGeo.length === 0 ? (
              <div className="p-8 text-center text-slate-400">所有地理幾何皆有對應之 CSV 數據！</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {unmatchedGeo.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-200 block">{item.name}</span>
                      <span className="font-mono text-slate-400 dark:text-slate-500 text-[11px]">
                        代碼: {item.geoKeyVal || '無'}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        onSelectRegion(item.id);
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 rounded transition-colors cursor-pointer"
                    >
                      於地圖檢視
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer with Pagination */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between">
          <div className="text-slate-500 dark:text-slate-400 text-xs">
            {activeTab === 'merged' && (
              <span>
                顯示第 {(page - 1) * pageSize + 1} -{' '}
                {Math.min(page * pageSize, filteredMergedRows.length)} 筆，共{' '}
                {filteredMergedRows.length} 筆
              </span>
            )}
          </div>

          {activeTab === 'merged' && totalPages > 1 && (
            <div className="flex items-center gap-1 font-mono">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                上一頁
              </button>
              <span className="px-2 text-slate-500 dark:text-slate-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                下一頁
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-lg transition-colors cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
