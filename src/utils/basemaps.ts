import type { BasemapConfig, BasemapStyle } from '../types';
import type { StyleSpecification } from 'maplibre-gl';

export const BASEMAP_CONFIGS: Record<BasemapStyle, BasemapConfig> = {
  'carto-dark': {
    id: 'carto-dark',
    // CARTO 的 rastertiles 現已要求 API Key（回傳 "API KEY REQUIRED" 浮水印圖磚），
    // 因此改用同風格的 Esri Canvas 灰階底圖（保留原 id 以維持相容）。
    name: 'Esri 深色極簡 (Dark Gray)',
    styleUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, HERE, Garmin, © OpenStreetMap contributors',
    thumbnail: '#191a1a',
  },
  'carto-positron': {
    id: 'carto-positron',
    name: 'Esri 淺色簡約 (Light Gray)',
    styleUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, HERE, Garmin, © OpenStreetMap contributors',
    thumbnail: '#f2f3f0',
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap 開放街道圖',
    styleUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    thumbnail: '#aad3df',
  },
  'esri-satellite': {
    id: 'esri-satellite',
    name: 'ESRI 衛星影像 (Satellite)',
    styleUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
    thumbnail: '#1c2d37',
  },
};

// Generates valid MapLibre GL style JSON from raster tiles
export function createRasterStyle(basemapId: BasemapStyle): StyleSpecification {
  const config = BASEMAP_CONFIGS[basemapId] || BASEMAP_CONFIGS['carto-dark'];

  return {
    version: 8,
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles: [config.styleUrl],
        tileSize: 256,
        attribution: config.attribution,
        // Esri Canvas 灰階底圖最大層級為 16，超過會 404；其餘依來源上限
        maxzoom: config.id === 'osm' ? 19 : config.id === 'esri-satellite' ? 18 : 16,
      },
    },
    layers: [
      {
        id: 'raster-basemap-layer',
        type: 'raster',
        source: 'raster-tiles',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };
}
