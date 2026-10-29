import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as echarts from 'echarts';
import {
  BarChart3,
  LineChart,
  PieChart,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Calculator,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import type { CustomFeatureCollection, CsvDataset, MetricStatistics, LegendBreak } from '../../types';
import { getColorForValue, formatNumber } from '../../utils/colorScales';
import type { ResolvedTheme } from '../../services/theme';

interface EChartsAnalyticsProps {
  geojson: CustomFeatureCollection;
  csv: CsvDataset | null;
  metricColumn: string;
  timeColumn: string | null;
  selectedTime: string | null;
  timeValues: string[];
  breaks: LegendBreak[];
  stats: MetricStatistics | null;
  selectedRegionId: string | number | null;
  onSelectRegion: (id: string | number | null) => void;
  theme?: ResolvedTheme;
}

export const EChartsAnalytics: React.FC<EChartsAnalyticsProps> = ({
  geojson,
  csv,
  metricColumn,
  timeColumn,
  breaks,
  stats,
  selectedRegionId,
  onSelectRegion,
  theme = 'dark',
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [chartType, setChartType] = useState<'bar' | 'trend' | 'distribution'>('bar');

  const isDark = theme === 'dark';

  // Prepare ranked items from current GeoJSON
  const rankedData = useMemo(() => {
    const list: Array<{ id: string | number; name: string; value: number; color: string }> = [];

    geojson.features.forEach((f, idx) => {
      const p = f.properties || {};
      const val = p._metricValue;
      if (p._matched && typeof val === 'number') {
        const idKey = p._idKey || f.id || idx;
        const color = getColorForValue(val, breaks, isDark ? '#38bdf8' : '#0284c7');
        list.push({
          id: idKey,
          name: p._regionName || `地區 ${idx}`,
          value: val,
          color,
        });
      }
    });

    list.sort((a, b) => a.value - b.value); // Ascending for horizontal bar
    return list;
  }, [geojson, breaks, isDark]);

  // Prepare trend data across time periods
  const trendData = useMemo(() => {
    if (!csv || !timeColumn) return null;

    const regionMap = new Map<string, Map<string, number>>();
    const allYears = Array.from(new Set(csv.rows.map((r) => String(r[timeColumn]).trim()))).sort();

    csv.rows.forEach((r) => {
      const name = r.county_name || r.name || r.region_name || r.country_name || r.state_name;
      const yr = String(r[timeColumn]).trim();
      const val = Number(String(r[metricColumn] || '').replace(/,/g, ''));
      if (name && yr && !isNaN(val)) {
        if (!regionMap.has(name)) regionMap.set(name, new Map());
        regionMap.get(name)!.set(yr, val);
      }
    });

    return { allYears, regionMap };
  }, [csv, timeColumn, metricColumn]);

  // Render ECharts options
  useEffect(() => {
    if (!chartRef.current || collapsed) return;

    if (chartInstance.current) {
      chartInstance.current.dispose();
      chartInstance.current = null;
    }

    chartInstance.current = echarts.init(
      chartRef.current,
      isDark ? 'dark' : undefined,
      { renderer: 'canvas' }
    );

    chartInstance.current.on('click', (params: any) => {
      if (params.data && params.data.id) {
        onSelectRegion(params.data.id);
      }
    });

    const chart = chartInstance.current;
    const textColor = isDark ? '#cbd5e1' : '#334155';
    const subTextColor = isDark ? '#94a3b8' : '#64748b';
    const splitColor = isDark ? '#1e293b' : '#f1f5f9';
    const axisColor = isDark ? '#475569' : '#cbd5e1';

    if (chartType === 'bar') {
      const names = rankedData.map((d) => d.name);
      const dataItems = rankedData.map((d) => ({
        value: d.value,
        id: d.id,
        rawName: d.name,
        itemStyle: {
          color: d.id === selectedRegionId ? (isDark ? '#f59e0b' : '#d97706') : d.color,
          borderRadius: [0, 3, 3, 0],
        },
      }));

      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderColor: isDark ? '#334155' : '#e2e8f0',
          textStyle: { color: isDark ? '#f8fafc' : '#0f172a' },
          formatter: (params: any) => {
            const p = Array.isArray(params) ? params[0] : params;
            const fullName = p.data?.rawName || p.name;
            return `
              <div style="font-size:12px;padding:3px;line-height:1.4;">
                <strong style="color:${isDark ? '#38bdf8' : '#0284c7'};">${fullName}</strong><br/>
                ${metricColumn}: <span style="font-weight:bold;">${formatNumber(p.value)}</span>
              </div>
            `;
          },
        },
        grid: {
          top: 15,
          bottom: 25,
          left: 10,
          right: 25,
          containLabel: true,
        },
        xAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: axisColor } },
          splitLine: { lineStyle: { color: splitColor } },
          axisLabel: {
            color: subTextColor,
            formatter: (v: number) => formatNumber(v),
            fontSize: 10,
          },
        },
        yAxis: {
          type: 'category',
          data: names,
          axisLine: { lineStyle: { color: axisColor } },
          axisLabel: {
            color: textColor,
            fontSize: 10,
            formatter: (val: string) => (val.length > 7 ? val.slice(0, 6) + '…' : val),
          },
        },
        series: [
          {
            name: metricColumn,
            type: 'bar',
            data: dataItems,
            barMaxWidth: 16,
          },
        ],
      }, true);
    } else if (chartType === 'trend' && trendData) {
      const { allYears, regionMap } = trendData;
      const seriesList: any[] = [];
      const topRegions = [...rankedData].reverse().slice(0, 5).map((d) => d.name);

      let targetRegions = topRegions;
      if (selectedRegionId) {
        const found = rankedData.find((d) => d.id === selectedRegionId);
        if (found) {
          targetRegions = [found.name, ...topRegions.filter((n) => n !== found.name).slice(0, 3)];
        }
      }

      const colors = ['#0284c7', '#059669', '#d97706', '#7c3aed', '#e11d48'];

      targetRegions.forEach((regName, idx) => {
        const vals = regionMap.get(regName);
        if (vals) {
          const points = allYears.map((yr) => vals.get(yr) ?? null);
          seriesList.push({
            name: regName,
            type: 'line',
            data: points,
            smooth: true,
            lineStyle: { width: idx === 0 ? 2.5 : 1.5 },
            itemStyle: { color: colors[idx % colors.length] },
            symbolSize: 5,
          });
        }
      });

      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderColor: isDark ? '#334155' : '#e2e8f0',
          textStyle: { color: isDark ? '#f8fafc' : '#0f172a' },
        },
        legend: {
          data: targetRegions,
          textStyle: { color: subTextColor, fontSize: 10 },
          top: 0,
          type: 'scroll',
        },
        grid: {
          top: 32,
          bottom: 25,
          left: 10,
          right: 20,
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: allYears,
          axisLine: { lineStyle: { color: axisColor } },
          axisLabel: { color: subTextColor, fontSize: 10 },
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: axisColor } },
          splitLine: { lineStyle: { color: splitColor } },
          axisLabel: {
            color: subTextColor,
            formatter: (v: number) => formatNumber(v),
            fontSize: 10,
          },
        },
        series: seriesList,
      }, true);
    } else {
      // Distribution chart based on breaks
      const breakLabels = breaks.map((b) => b.label);
      const breakCounts = breaks.map((b) => ({
        value: b.count,
        name: b.label,
        itemStyle: { color: b.color },
      }));

      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderColor: isDark ? '#334155' : '#e2e8f0',
          textStyle: { color: isDark ? '#f8fafc' : '#0f172a' },
        },
        grid: {
          top: 15,
          bottom: 30,
          left: 10,
          right: 20,
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: breakLabels,
          axisLine: { lineStyle: { color: axisColor } },
          axisLabel: {
            color: subTextColor,
            fontSize: 9,
            rotate: 20,
            formatter: (val: string) => (val.length > 10 ? val.slice(0, 9) + '…' : val),
          },
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: axisColor } },
          splitLine: { lineStyle: { color: splitColor } },
          axisLabel: { color: subTextColor, fontSize: 10 },
        },
        series: [
          {
            name: '地區數量',
            type: 'bar',
            data: breakCounts,
            barMaxWidth: 24,
            borderRadius: [3, 3, 0, 0],
          },
        ],
      }, true);
    }

    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [rankedData, trendData, chartType, metricColumn, selectedRegionId, breaks, collapsed, isDark]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg p-2 shadow-sm flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        title="展開 ECharts 統計圖表"
      >
        <BarChart3 className="w-4 h-4 text-slate-600 dark:text-sky-400" />
        <span className="text-xs font-semibold">分析圖表</span>
        <ChevronLeft className="w-4 h-4 text-slate-400" />
      </button>
    );
  }

  return (
    <div
      data-testid="echarts-card-container"
      className="w-full max-w-[calc(100vw-24px)] sm:w-88 max-h-[85vh] bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-xl shadow-md dark:shadow-xl flex flex-col overflow-hidden text-xs text-slate-800 dark:text-slate-100 transition-colors"
    >
      {/* 1. Header: 標題與切換選單 (Strict Tier 1) */}
      <div
        data-testid="echarts-tier-1-header"
        className="p-2 sm:p-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/70 shrink-0"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <BarChart3 className="w-4 h-4 text-slate-700 dark:text-sky-400 shrink-0" />
          <span className="font-bold text-slate-900 dark:text-slate-200 truncate">ECharts 統計圖表</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Chart type toggle */}
          <button
            onClick={() => setChartType('bar')}
            title="各區水平柱狀排行圖"
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              chartType === 'bar'
                ? 'bg-slate-900 text-white dark:bg-sky-600'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            <span className="hidden sm:inline">排行</span>
          </button>
          {trendData && (
            <button
              onClick={() => setChartType('trend')}
              title="多期時序走勢趨勢圖"
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                chartType === 'trend'
                  ? 'bg-slate-900 text-white dark:bg-sky-600'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <LineChart className="w-3 h-3" />
              <span className="hidden sm:inline">時序</span>
            </button>
          )}
          <button
            onClick={() => setChartType('distribution')}
            title="分級分佈直方圖"
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              chartType === 'distribution'
                ? 'bg-slate-900 text-white dark:bg-sky-600'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <PieChart className="w-3 h-3" />
            <span className="hidden sm:inline">分佈</span>
          </button>
          <button
            onClick={() => setCollapsed(true)}
            title="收合圖表面板"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ml-0.5"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Description: 說明區 (Strict Tier 2) */}
      <div
        data-testid="echarts-tier-2-desc"
        className="px-3 py-1.5 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0"
      >
        <span className="truncate">
          {chartType === 'bar'
            ? '各區指標排序（點擊長條即於地圖定位）'
            : chartType === 'trend'
            ? '多期時間序列趨勢比較'
            : '各分級區間之地區數量分佈'}
        </span>
        <button
          onClick={() => chartInstance.current?.resize()}
          title="重新整理圖表視圖"
          className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer p-0.5 shrink-0"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* 3. Statistics: 獨立統計數值區 (Strict Tier 3 - Normal Document Flow, Never Overlaid) */}
      {stats && (
        <div
          data-testid="echarts-tier-3-stats"
          className="p-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0"
        >
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <div className="p-1.5 bg-slate-50 dark:bg-slate-950/60 rounded border border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-400 block truncate flex items-center gap-0.5">
                <Calculator className="w-2.5 h-2.5 text-sky-500 shrink-0" /> 平均
              </span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                {formatNumber(stats.mean)}
              </span>
            </div>
            <div className="p-1.5 bg-slate-50 dark:bg-slate-950/60 rounded border border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-400 block truncate flex items-center gap-0.5">
                <Activity className="w-2.5 h-2.5 text-emerald-500 shrink-0" /> 中位
              </span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                {formatNumber(stats.median)}
              </span>
            </div>
            <div className="p-1.5 bg-slate-50 dark:bg-slate-950/60 rounded border border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-400 block truncate flex items-center gap-0.5">
                <ArrowUpRight className="w-2.5 h-2.5 text-amber-500 shrink-0" /> 最大
              </span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                {formatNumber(stats.max)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Chart: 圖表繪製區 (Strict Tier 4 - Document Flow Container) */}
      <div
        data-testid="echarts-tier-4-chart"
        className="p-2 flex-1 min-h-[220px] overflow-hidden"
      >
        <div ref={chartRef} className="w-full h-56 sm:h-64" />
      </div>

      {/* 5. Legend / Footer: 補充資訊區 (Strict Tier 5) */}
      <div
        data-testid="echarts-tier-5-footer"
        className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[10px] text-slate-400 flex items-center justify-between shrink-0"
      >
        <span>繪製 {rankedData.length} 個空間多邊形</span>
        <span className="font-mono text-slate-500">指標: {metricColumn}</span>
      </div>
    </div>
  );
};
