import type { BasemapConfig, BasemapStyle } from '../types';
import type { StyleSpecification } from 'maplibre-gl';

export const BASEMAP_CONFIGS: Record<BasemapStyle, BasemapConfig> = {
  'carto-dark': {
    id: 'carto-dark',
    name: 'CARTO 深色極簡 (Dark Matter)',
    styleUrl: 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>, © <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
    thumbnail: '#191a1a',
  },
  'carto-positron': {
    id: 'carto-positron',
    name: 'CARTO 淺色簡約 (Positron)',
    styleUrl: 'https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>, © <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
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
        maxzoom: 19,
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
