import { describe, it, expect } from 'vitest';
import {
  normalizeKey,
  getGeoKeyCandidates,
  getCsvKeyCandidates,
  detectTimeColumn,
  extractTimeValues,
  detectNumericColumns,
  suggestBestKeyMatch,
  performDataMerge,
} from './dataMerge';
import type { CustomFeatureCollection, CsvDataset, MergeConfig } from '../types';

describe('Data Merge & Geo Spatial Joining Unit Tests', () => {
  const sampleGeoJSON: CustomFeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { COUNTYCODE: '63000', COUNTYNAME: '臺北市' },
        geometry: { type: 'Polygon', coordinates: [[[121, 25], [121.1, 25], [121.1, 25.1], [121, 25]]] },
      },
      {
        type: 'Feature',
        properties: { COUNTYCODE: '64000', COUNTYNAME: '高雄市' },
        geometry: { type: 'Polygon', coordinates: [[[120.3, 22.6], [120.4, 22.6], [120.4, 22.7], [120.3, 22.6]]] },
      },
      {
        type: 'Feature',
        properties: { COUNTYCODE: '65000', COUNTYNAME: '新北市' },
        geometry: { type: 'Polygon', coordinates: [[[121.5, 25.0], [121.6, 25.0], [121.6, 25.1], [121.5, 25.0]]] },
      },
    ],
  };

  const sampleCsv: CsvDataset = {
    fileName: 'test.csv',
    headers: ['county_code', 'county_name', 'year', 'population', 'median_income'],
    totalRows: 6,
    rows: [
      { county_code: '63000', county_name: '臺北市', year: '2024', population: '2500000', median_income: '1080' },
      { county_code: '64000', county_name: '高雄市', year: '2024', population: '2730000', median_income: '850' },
      // Note: 99999 has no matching geometry in sampleGeoJSON
      { county_code: '99999', county_name: '南沙特定區', year: '2024', population: '210', median_income: '700' },
      // Note: 88888 has no matching geometry
      { county_code: '88888', county_name: '東沙試驗站', year: '2024', population: '150', median_income: '720' },
      // Prior year records
      { county_code: '63000', county_name: '臺北市', year: '2023', population: '2480000', median_income: '1050' },
      { county_code: '64000', county_name: '高雄市', year: '2023', population: '2720000', median_income: '830' },
    ],
  };

  it('normalizes string keys correctly', () => {
    expect(normalizeKey('  63000  ')).toBe('63000');
    expect(normalizeKey('Taipei_City')).toBe('taipei_city');
    expect(normalizeKey(null)).toBe('');
    expect(normalizeKey(undefined)).toBe('');
    expect(normalizeKey(63000)).toBe('63000');
  });

  it('detects candidate join keys from GeoJSON and CSV', () => {
    const geoCandidates = getGeoKeyCandidates(sampleGeoJSON);
    expect(geoCandidates).toContain('COUNTYCODE');
    expect(geoCandidates).toContain('COUNTYNAME');

    const csvCandidates = getCsvKeyCandidates(sampleCsv);
    expect(csvCandidates).toContain('county_code');
    expect(csvCandidates).toContain('county_name');
  });

  it('detects time column and extracts sorted unique time values', () => {
    const detectedTime = detectTimeColumn(sampleCsv);
    expect(detectedTime).toBe('year');

    const timeValues = extractTimeValues(sampleCsv, 'year');
    expect(timeValues).toEqual(['2023', '2024']);
  });

  it('detects numeric columns in CSV while excluding keys and time', () => {
    const numerics = detectNumericColumns(sampleCsv, ['county_code', 'year']);
    expect(numerics).toContain('population');
    expect(numerics).toContain('median_income');
    expect(numerics).not.toContain('county_name');
  });

  it('suggests best key match between GeoJSON and CSV', () => {
    const suggestion = suggestBestKeyMatch(sampleGeoJSON, sampleCsv);
    expect(suggestion.geoKey).toBe('COUNTYCODE');
    expect(suggestion.csvKey).toBe('county_code');
    expect(suggestion.score).toBeGreaterThan(0);
  });

  it('strictly handles unmatched CSV records WITHOUT fabricating coordinates', () => {
    const config: MergeConfig = {
      geoKey: 'COUNTYCODE',
      csvKey: 'county_code',
      timeColumn: 'year',
      selectedTime: '2024',
      metricColumn: 'median_income',
      aliasMap: {},
    };

    const result = performDataMerge(sampleGeoJSON, sampleCsv, config, 'jenks', 'viridis', false, 3);

    // 1. Matches Taipei and Kaohsiung
    expect(result.matchedCount).toBe(2);

    // 2. Taipei and Kaohsiung have joined metric values
    const tpe = result.mergedGeoJSON.features.find((f) => f.properties.COUNTYCODE === '63000');
    expect(tpe?.properties._matched).toBe(true);
    expect(tpe?.properties._metricValue).toBe(1080);
    expect(tpe?.properties._rank).toBe(1);

    // 3. New Taipei (65000) exists in GeoJSON but has NO CSV row in 2024
    const ntp = result.mergedGeoJSON.features.find((f) => f.properties.COUNTYCODE === '65000');
    expect(ntp?.properties._matched).toBe(false);
    expect(ntp?.properties._metricValue).toBeNull();
    expect(result.unmatchedGeoFeatures.length).toBe(1);
    expect(result.unmatchedGeoFeatures[0].geoKeyVal).toBe('65000');

    // 4. Critical requirement: Check unmatched CSV records
    // 99999 and 88888 are in CSV 2024 but NOT in GeoJSON
    expect(result.unmatchedCsvRows.length).toBe(2);

    const unmatchedCodes = result.unmatchedCsvRows.map((u) => u.joinValue);
    expect(unmatchedCodes).toContain('99999');
    expect(unmatchedCodes).toContain('88888');

    // CRITICAL: NEVER FABRICATE COORDINATES FOR UNMATCHED ROWS
    result.unmatchedCsvRows.forEach((u) => {
      // Must not have coordinates or spatial geometry injected
      expect((u as any).coordinates).toBeUndefined();
      expect((u as any).geometry).toBeUndefined();
      expect((u as any).lat).toBeUndefined();
      expect((u as any).lng).toBeUndefined();
      expect(u.reason).toContain('未找到對應地理幾何多邊形');
    });

    // 5. Total GeoJSON features count remains untouched
    expect(result.mergedGeoJSON.features.length).toBe(3);
  });

  it('supports manual alias mapping when user connects an unmatched key to an existing region', () => {
    const config: MergeConfig = {
      geoKey: 'COUNTYCODE',
      csvKey: 'county_code',
      timeColumn: 'year',
      selectedTime: '2024',
      metricColumn: 'median_income',
      aliasMap: {
        '88888': '65000', // Manually map 88888 to New Taipei 65000
      },
    };

    const result = performDataMerge(sampleGeoJSON, sampleCsv, config, 'jenks', 'viridis', false, 3);

    // Now 88888 mapped to 65000, so matched count is 3
    expect(result.matchedCount).toBe(3);

    const ntp = result.mergedGeoJSON.features.find((f) => f.properties.COUNTYCODE === '65000');
    expect(ntp?.properties._matched).toBe(true);
    expect(ntp?.properties._metricValue).toBe(720);

    // Only 99999 remains unmatched
    expect(result.unmatchedCsvRows.length).toBe(1);
    expect(result.unmatchedCsvRows[0].joinValue).toBe('99999');
  });

  it('handles empty CSV and malformed inputs gracefully without crashing', () => {
    const emptyCsv: CsvDataset = {
      fileName: 'empty.csv',
      headers: [],
      rows: [],
      totalRows: 0,
    };

    const config: MergeConfig = {
      geoKey: 'COUNTYCODE',
      csvKey: 'none',
      timeColumn: null,
      selectedTime: null,
      metricColumn: 'none',
      aliasMap: {},
    };

    const result = performDataMerge(sampleGeoJSON, emptyCsv, config);
    expect(result.matchedCount).toBe(0);
    expect(result.unmatchedCsvRows.length).toBe(0);
    expect(result.activeStats).toBeNull();
  });
});
