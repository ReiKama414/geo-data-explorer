import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as echarts from 'echarts';
import { BarChart3, LineChart, PieChart, ChevronRight, ChevronLeft, RefreshCw } from 'lucide-react';
import type { CustomFeatureCollection, CsvDataset, MetricStatistics, LegendBreak } from '../../types';
import { getColorForValue, formatNumber } from '../../utils/colorScales';

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
}

export const EChartsAnalytics: React.FC<EChartsAnalyticsProps> = ({
  geojson,
  csv,
  metricColumn,
  timeColumn,
  breaks,
  selectedRegionId,
  onSelectRegion,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [chartType, setChartType] = useState<'bar' | 'trend' | 'distribution'>('bar');

  // Prepare ranked items from current GeoJSON
  const rankedData = useMemo(() => {
    const list: Array<{ id: string | number; name: string; value: number; color: string }> = [];

    geojson.features.forEach((f, idx) => {
      const p = f.properties || {};
      const val = p._metricValue;
      if (p._matched && typeof val === 'number') {
        const idKey = p._idKey || f.id || idx;
        const color = getColorForValue(val, breaks, '#38bdf8');
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
  }, [geojson, breaks]);

  // Prepare trend data across time periods
  const trendData = useMemo(() => {
    if (!csv || !timeColumn) return null;

    // Group CSV by region and time
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

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark', {
        renderer: 'canvas',
      });

      chartInstance.current.on('click', (params: any) => {
        if (params.data && params.data.id) {
          onSelectRegion(params.data.id);
        }
      });
    }

    const chart = chartInstance.current;

    if (chartType === 'bar') {
      const names = rankedData.map((d) => d.name);
      const dataItems = rankedData.map((d) => ({
        value: d.value,
        id: d.id,
        itemStyle: {
          color: d.id === selectedRegionId ? '#f59e0b' : d.color,
          borderRadius: [0, 4, 4, 0],
        },
      }));

      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params: any) => {
            const p = Array.isArray(params) ? params[0] : params;
            return `
              <div style="font-size:12px;padding:2px;">
                <strong>${p.name}</strong><br/>
                ${metricColumn}: <span style="color:#38bdf8;font-weight:bold;">${formatNumber(p.value)}</span>
              </div>
            `;
          },
        },
        grid: { top: 15, bottom: 25, left: 75, right: 30 },
        xAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: '#475569' } },
          splitLine: { lineStyle: { color: '#1e293b' } },
          axisLabel: {
            color: '#94a3b8',
            formatter: (v: number) => formatNumber(v),
            fontSize: 10,
          },
        },
        yAxis: {
          type: 'category',
          data: names,
          axisLine: { lineStyle: { color: '#475569' } },
          axisLabel: { color: '#cbd5e1', fontSize: 11 },
        },
        series: [
          {
            name: metricColumn,
            type: 'bar',
            data: dataItems,
            barMaxWidth: 18,
          },
        ],
      }, true);
    } else if (chartType === 'trend' && trendData) {
      const { allYears, regionMap } = trendData;

      // Decide which series to plot: if selectedRegionId exists, highlight that region; else top 5 regions
      const seriesList: any[] = [];
      const topRegions = [...rankedData].reverse().slice(0, 5).map((d) => d.name);

      let targetRegions = topRegions;
      if (selectedRegionId) {
        const found = rankedData.find((d) => d.id === selectedRegionId);
        if (found) {
          targetRegions = [found.name, ...topRegions.filter((n) => n !== found.name).slice(0, 3)];
        }
      }

      const colors = ['#38bdf8', '#34d399', '#f59e0b', '#a78bfa', '#f43f5e'];

      targetRegions.forEach((regName, idx) => {
        const vals = regionMap.get(regName);
        if (vals) {
          const points = allYears.map((yr) => vals.get(yr) ?? null);
          seriesList.push({
            name: regName,
            type: 'line',
            data: points,
            smooth: true,
            lineStyle: { width: idx === 0 ? 3 : 1.5 },
            itemStyle: { color: colors[idx % colors.length] },
            symbolSize: 6,
          });
        }
      });

      chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
        },
        legend: {
          data: targetRegions,
          textStyle: { color: '#94a3b8', fontSize: 10 },
          top: 0,
        },
        grid: { top: 35, bottom: 25, left: 55, right: 20 },
        xAxis: {
          type: 'category',
          data: allYears,
          axisLine: { lineStyle: { color: '#475569' } },
          axisLabel: { color: '#94a3b8', fontSize: 10 },
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: '#475569' } },
          splitLine: { lineStyle: { color: '#1e293b' } },
          axisLabel: {
            color: '#94a3b8',
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
        },
        grid: { top: 15, bottom: 40, left: 45, right: 20 },
        xAxis: {
          type: 'category',
          data: breakLabels,
          axisLine: { lineStyle: { color: '#475569' } },
          axisLabel: { color: '#94a3b8', fontSize: 9, rotate: 20 },
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: '#475569' } },
          splitLine: { lineStyle: { color: '#1e293b' } },
          axisLabel: { color: '#94a3b8', fontSize: 10 },
        },
        series: [
          {
            name: '地區數量',
            type: 'bar',
            data: breakCounts,
            barMaxWidth: 26,
            borderRadius: [4, 4, 0, 0],
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
  }, [rankedData, trendData, chartType, metricColumn, selectedRegionId, breaks, collapsed]);

  // Clean up on unmount
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
        className="bg-slate-900 text-slate-300 border border-slate-700 rounded-lg p-2.5 shadow-lg flex items-center gap-2 cursor-pointer hover:bg-slate-800"
        title="展開 ECharts 統計圖表"
      >
        <BarChart3 className="w-4 h-4 text-sky-400" />
        <span className="text-xs font-semibold">分析圖表</span>
        <ChevronLeft className="w-4 h-4 text-slate-400" />
      </button>
    );
  }

  return (
    <div className="w-84 max-h-[85vh] bg-slate-900 border border-slate-700 rounded-xl shadow-xl flex flex-col overflow-hidden text-xs">
      {/* Header */}
      <div className="p-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-slate-200">ECharts 統計圖表</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Chart type toggle */}
          <button
            onClick={() => setChartType('bar')}
            title="區域排名柱狀圖"
            className={`p-1.5 rounded cursor-pointer ${
              chartType === 'bar' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
          {trendData && (
            <button
              onClick={() => setChartType('trend')}
              title="時序走勢趨勢圖"
              className={`p-1.5 rounded cursor-pointer ${
                chartType === 'trend' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setChartType('distribution')}
            title="階層分佈直方圖"
            className={`p-1.5 rounded cursor-pointer ${
              chartType === 'distribution' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            title="收合圖表面板"
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer ml-1"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtitle */}
      <div className="px-3 py-1.5 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>
          {chartType === 'bar'
            ? '各區指標排序（點擊長條即於地圖定位）'
            : chartType === 'trend'
            ? '多期時間序列趨勢比較'
            : '各分級區間之地區數量分佈'}
        </span>
        <button
          onClick={() => chartInstance.current?.resize()}
          title="重新整理圖表視圖"
          className="hover:text-slate-200 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Chart Canvas Container */}
      <div className="p-2 flex-1">
        <div ref={chartRef} className="w-full h-72" />
      </div>
    </div>
  );
};
