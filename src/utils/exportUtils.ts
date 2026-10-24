import Papa from 'papaparse';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { CustomFeatureCollection, UnmatchedCsvRecord } from '../types';

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportGeoJSON(geojson: CustomFeatureCollection, filename = 'merged-geodata.geojson') {
  const jsonStr = JSON.stringify(geojson, null, 2);
  downloadFile(jsonStr, filename, 'application/geo+json;charset=utf-8');
}

export function exportFeaturesToCSV(features: any[], filename = 'merged-geodata.csv') {
  if (features.length === 0) return;
  const rows = features.map((f) => {
    const props = { ...f.properties };
    return props;
  });
  const csv = Papa.unparse(rows);
  downloadFile('\uFEFF' + csv, filename, 'text/csv;charset=utf-8');
}

export function exportUnmatchedToCSV(unmatched: UnmatchedCsvRecord[], filename = 'unmatched-records.csv') {
  if (unmatched.length === 0) return;
  const rows = unmatched.map((item) => ({
    未匹配原因: item.reason,
    鍵值: item.joinValue,
    原始列號: item.originalIndex + 1,
    ...item.row,
  }));
  const csv = Papa.unparse(rows);
  downloadFile('\uFEFF' + csv, filename, 'text/csv;charset=utf-8');
}

export function exportMapImage(map: MapLibreMap | null, filename = 'geo-choropleth-map.png') {
  if (!map) return;
  try {
    const canvas = map.getCanvas();
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error('Failed to export map snapshot:', err);
    alert('無法匯出地圖截圖，可能是因為底圖來源跨域限制。');
  }
}
