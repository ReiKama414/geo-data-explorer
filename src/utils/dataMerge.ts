import type {
  CustomFeatureCollection,
  CsvDataset,
  MergeConfig,
  MergeResult,
  UnmatchedCsvRecord,
  UnmatchedGeoRecord,
  MetricStatistics,
  ClassificationMethod,
  PaletteId,
} from '../types';
import { generateLegendBreaks } from './colorScales';

export function normalizeKey(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().toLowerCase();
}

// Auto-detect candidate keys from GeoJSON
export function getGeoKeyCandidates(geojson: CustomFeatureCollection): string[] {
  if (!geojson.features || geojson.features.length === 0) return [];
  const keyCounts: Record<string, number> = {};
  geojson.features.slice(0, 50).forEach((feat) => {
    if (feat.properties) {
      Object.keys(feat.properties).forEach((k) => {
        keyCounts[k] = (keyCounts[k] || 0) + 1;
      });
    }
  });

  // Prioritize typical identifier names
  const priorityRegex = /(code|id|iso|iso3|iso2|fips|name|adm|county|state|country)/i;

  return Object.keys(keyCounts).sort((a, b) => {
    const aMatch = priorityRegex.test(a) ? 1 : 0;
    const bMatch = priorityRegex.test(b) ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    return keyCounts[b] - keyCounts[a];
  });
}

// Auto-detect candidate keys from CSV
export function getCsvKeyCandidates(csv: CsvDataset): string[] {
  if (!csv.headers || csv.headers.length === 0) return [];
  const priorityRegex = /(code|id|iso|iso3|iso2|fips|name|region|county|state|country)/i;

  return [...csv.headers].sort((a, b) => {
    const aMatch = priorityRegex.test(a) ? 1 : 0;
    const bMatch = priorityRegex.test(b) ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    return 0;
  });
}

// Auto-detect time columns in CSV
export function detectTimeColumn(csv: CsvDataset): string | null {
  const timeRegex = /(year|date|month|quarter|time|period|年份|年度|日期)/i;
  for (const h of csv.headers) {
    if (timeRegex.test(h)) return h;
  }
  // Check if any column contains 4-digit years in range 1950 - 2050
  for (const h of csv.headers) {
    const sampleVals = csv.rows.slice(0, 30).map((r) => String(r[h]).trim());
    const yearLikeCount = sampleVals.filter((v) => /^(19|20)\d{2}$/.test(v)).length;
    if (sampleVals.length > 5 && yearLikeCount / sampleVals.length > 0.8) {
      return h;
    }
  }
  return null;
}

// Extract unique time values sorted
export function extractTimeValues(csv: CsvDataset, timeColumn: string | null): string[] {
  if (!timeColumn) return [];
  const set = new Set<string>();
  csv.rows.forEach((r) => {
    const val = r[timeColumn];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      set.add(String(val).trim());
    }
  });
  return Array.from(set).sort((a, b) => {
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });
}

// Auto-detect numeric columns in CSV (metric candidates)
export function detectNumericColumns(csv: CsvDataset, excludeColumns: string[] = []): string[] {
  const candidates: string[] = [];
  const excludeSet = new Set(excludeColumns.map((c) => c.toLowerCase()));

  csv.headers.forEach((h) => {
    if (excludeSet.has(h.toLowerCase())) return;

    let numCount = 0;
    let validCount = 0;
    csv.rows.slice(0, 100).forEach((r) => {
      const val = r[h];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        validCount++;
        const parsed = Number(String(val).replace(/,/g, '').trim());
        if (!isNaN(parsed) && isFinite(parsed)) {
          numCount++;
        }
      }
    });

    if (validCount > 0 && numCount / validCount >= 0.7) {
      candidates.push(h);
    }
  });

  return candidates;
}

// Suggest best join key pair
export function suggestBestKeyMatch(
  geojson: CustomFeatureCollection,
  csv: CsvDataset
): { geoKey: string; csvKey: string; score: number } {
  const geoKeys = getGeoKeyCandidates(geojson);
  const csvKeys = getCsvKeyCandidates(csv);

  let bestGeoKey = geoKeys[0] || '';
  let bestCsvKey = csvKeys[0] || '';
  let maxMatched = -1;

  // Test permutations on first 100 features/rows
  const geoSample = geojson.features.slice(0, 60);
  const csvSample = csv.rows.slice(0, 150);

  for (const gk of geoKeys.slice(0, 6)) {
    const geoVals = new Set(geoSample.map((f) => normalizeKey(f.properties?.[gk])));
    for (const ck of csvKeys.slice(0, 6)) {
      let matches = 0;
      csvSample.forEach((r) => {
        const key = normalizeKey(r[ck]);
        if (key && geoVals.has(key)) matches++;
      });
      if (matches > maxMatched) {
        maxMatched = matches;
        bestGeoKey = gk;
        bestCsvKey = ck;
      }
    }
  }

  return { geoKey: bestGeoKey, csvKey: bestCsvKey, score: maxMatched };
}

// Perform the merge operation
export function performDataMerge(
  geojson: CustomFeatureCollection,
  csv: CsvDataset,
  config: MergeConfig,
  classificationMethod: ClassificationMethod = 'jenks',
  paletteId: PaletteId = 'viridis',
  paletteReversed = false,
  numClasses = 5
): MergeResult {
  const { geoKey, csvKey, timeColumn, selectedTime, metricColumn, aliasMap = {} } = config;

  // Filter CSV rows by time if timeColumn is set
  const activeCsvRows =
    timeColumn && selectedTime
      ? csv.rows.filter((r) => String(r[timeColumn]).trim() === String(selectedTime).trim())
      : csv.rows;

  // Index active CSV rows by normalized key
  // Also support aliasMap: if aliasMap has entry, redirect to alias target
  const csvLookup = new Map<string, { row: Record<string, any>; originalIndex: number }>();
  const unmatchedCsvTracker = new Map<string, { row: Record<string, any>; originalIndex: number }>();

  activeCsvRows.forEach((row, idx) => {
    const rawCsvKeyVal = String(row[csvKey] || '').trim();
    const normalizedCsvVal = normalizeKey(rawCsvKeyVal);
    // Check if user set an alias mapping
    const effectiveKey = aliasMap[rawCsvKeyVal] ? normalizeKey(aliasMap[rawCsvKeyVal]) : normalizedCsvVal;

    if (effectiveKey) {
      csvLookup.set(effectiveKey, { row, originalIndex: idx });
      unmatchedCsvTracker.set(effectiveKey, { row, originalIndex: idx });
    }
  });

  const matchedValues: number[] = [];
  const unmatchedGeoFeatures: UnmatchedGeoRecord[] = [];
  let matchedCount = 0;

  // Deep clone GeoJSON features to avoid mutating input directly
  const mergedFeatures = geojson.features.map((feature, idx) => {
    const props = { ...(feature.properties || {}) };
    const rawGeoVal = props[geoKey];
    const normalizedGeoVal = normalizeKey(rawGeoVal);

    // Look for matching CSV row
    const match = csvLookup.get(normalizedGeoVal);

    if (match) {
      matchedCount++;
      // Remove from unmatched CSV tracker
      unmatchedCsvTracker.delete(normalizedGeoVal);

      // Merge CSV fields into properties
      Object.assign(props, match.row);

      // Parse metric value
      const rawMetricVal = match.row[metricColumn];
      let numVal: number | null = null;
      if (rawMetricVal !== undefined && rawMetricVal !== null && rawMetricVal !== '') {
        const parsed = Number(String(rawMetricVal).replace(/,/g, '').trim());
        if (!isNaN(parsed) && isFinite(parsed)) {
          numVal = parsed;
          matchedValues.push(numVal);
        }
      }

      props._matched = true;
      props._joinKey = normalizedGeoVal;
      props._metricValue = numVal;
      props._regionName =
        props.COUNTYNAME ||
        props.name ||
        props.NAME ||
        props.county_name ||
        props.country_name ||
        props.state_name ||
        rawGeoVal;
    } else {
      props._matched = false;
      props._joinKey = normalizedGeoVal;
      props._metricValue = null;
      props._regionName =
        props.COUNTYNAME ||
        props.name ||
        props.NAME ||
        props.county_name ||
        props.country_name ||
        props.state_name ||
        rawGeoVal ||
        `Feature #${idx}`;

      unmatchedGeoFeatures.push({
        id: feature.id || idx,
        name: String(props._regionName),
        geoKeyVal: String(rawGeoVal || ''),
        properties: props,
      });
    }

    return {
      ...feature,
      properties: props,
    };
  });

  // Calculate ranks and percentiles among matched features
  const sortedValues = [...matchedValues].sort((a, b) => b - a);
  mergedFeatures.forEach((feat) => {
    const val = feat.properties._metricValue;
    if (typeof val === 'number') {
      const rank = sortedValues.indexOf(val) + 1;
      feat.properties._rank = rank;
      feat.properties._rankTotal = sortedValues.length;
      feat.properties._percentile = Math.round(((sortedValues.length - rank + 1) / sortedValues.length) * 100);
    } else {
      feat.properties._rank = null;
      feat.properties._percentile = null;
    }
  });

  // Collect unmatched CSV records (DO NOT fabricate coordinates)
  const unmatchedCsvRows: UnmatchedCsvRecord[] = [];
  unmatchedCsvTracker.forEach((item) => {
    const rawVal = item.row[csvKey];
    unmatchedCsvRows.push({
      originalIndex: item.originalIndex,
      row: item.row,
      joinValue: String(rawVal || '(空值)'),
      reason: `CSV 鍵值 "${rawVal}" 在 GeoJSON 屬性 "${geoKey}" 中未找到對應地理幾何多邊形`,
    });
  });

  // Generate statistics
  let stats: MetricStatistics | null = null;
  if (matchedValues.length > 0) {
    const sum = matchedValues.reduce((acc, v) => acc + v, 0);
    const mean = sum / matchedValues.length;
    const sorted = [...matchedValues].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const variance =
      matchedValues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / matchedValues.length;

    stats = {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      count: matchedValues.length,
      mean: Number(mean.toFixed(2)),
      median: Number(median.toFixed(2)),
      sum: Number(sum.toFixed(2)),
      stdDev: Number(Math.sqrt(variance).toFixed(2)),
    };
  }

  // Generate breaks
  const breaks = generateLegendBreaks(
    matchedValues,
    numClasses,
    classificationMethod,
    paletteId,
    paletteReversed
  );

  const timeValues = extractTimeValues(csv, timeColumn);
  const numericColumns = detectNumericColumns(csv, [csvKey, timeColumn || '']);

  return {
    mergedGeoJSON: {
      type: 'FeatureCollection',
      features: mergedFeatures,
    },
    matchedCount,
    totalGeoFeatures: geojson.features.length,
    totalCsvRows: activeCsvRows.length,
    unmatchedCsvRows,
    unmatchedGeoFeatures,
    allMetricColumns: numericColumns,
    timeValues,
    activeStats: stats,
    currentBreaks: breaks,
  };
}
