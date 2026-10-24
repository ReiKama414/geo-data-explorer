import type { FeatureCollection, Feature, Geometry } from 'geojson';

export interface GeoJSONProperties {
  [key: string]: any;
}

export type CustomFeatureCollection = FeatureCollection<Geometry, GeoJSONProperties>;
export type CustomFeature = Feature<Geometry, GeoJSONProperties>;

export interface CsvDataset {
  fileName: string;
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export type ClassificationMethod = 'quantile' | 'equalInterval' | 'jenks' | 'logarithmic';

export type PaletteId =
  | 'viridis'
  | 'plasma'
  | 'blues'
  | 'greens'
  | 'oranges'
  | 'purples'
  | 'rdylgn'
  | 'rdbu'
  | 'spectral';

export interface ColorPalette {
  id: PaletteId;
  name: string;
  type: 'sequential' | 'diverging';
  colors: string[];
}

export interface LegendBreak {
  min: number;
  max: number;
  label: string;
  color: string;
  count: number;
}

export interface MergeConfig {
  geoKey: string;
  csvKey: string;
  timeColumn: string | null;
  selectedTime: string | null;
  metricColumn: string;
  aliasMap: Record<string, string>; // csvKeyVal -> geoKeyVal override
}

export interface UnmatchedCsvRecord {
  originalIndex: number;
  row: Record<string, any>;
  joinValue: string;
  reason: string;
}

export interface UnmatchedGeoRecord {
  id: string | number;
  name: string;
  geoKeyVal: string;
  properties: Record<string, any>;
}

export interface MetricStatistics {
  min: number;
  max: number;
  count: number;
  mean: number;
  median: number;
  sum: number;
  stdDev: number;
}

export interface MergeResult {
  mergedGeoJSON: CustomFeatureCollection;
  matchedCount: number;
  totalGeoFeatures: number;
  totalCsvRows: number;
  unmatchedCsvRows: UnmatchedCsvRecord[];
  unmatchedGeoFeatures: UnmatchedGeoRecord[];
  allMetricColumns: string[];
  timeValues: string[];
  activeStats: MetricStatistics | null;
  currentBreaks: LegendBreak[];
}

export type BasemapStyle = 'carto-positron' | 'carto-dark' | 'osm' | 'esri-satellite';

export interface BasemapConfig {
  id: BasemapStyle;
  name: string;
  styleUrl: string;
  attribution: string;
  thumbnail: string;
}
