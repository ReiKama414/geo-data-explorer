import { scaleQuantile } from 'd3-scale';
import type { ClassificationMethod, ColorPalette, LegendBreak, PaletteId } from '../types';

// Predefined high quality color ramps
export const COLOR_PALETTES: Record<PaletteId, ColorPalette> = {
  viridis: {
    id: 'viridis',
    name: '翠綠知覺 (Viridis)',
    type: 'sequential',
    colors: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'],
  },
  plasma: {
    id: 'plasma',
    name: '熱力電漿 (Plasma)',
    type: 'sequential',
    colors: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636', '#f0f921'],
  },
  blues: {
    id: 'blues',
    name: '深海湛藍 (Blues)',
    type: 'sequential',
    colors: ['#eff3ff', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c'],
  },
  greens: {
    id: 'greens',
    name: '自然翠綠 (Greens)',
    type: 'sequential',
    colors: ['#edf8e9', '#c7e9c0', '#a1d99b', '#74c476', '#31a354', '#006d2c'],
  },
  oranges: {
    id: 'oranges',
    name: '暖陽暖橘 (Oranges)',
    type: 'sequential',
    colors: ['#feedde', '#fdd0a2', '#fdae6b', '#fd8d3c', '#e6550d', '#a63603'],
  },
  purples: {
    id: 'purples',
    name: '典雅紫韻 (Purples)',
    type: 'sequential',
    colors: ['#f2f0f7', '#dadaeb', '#bcbddc', '#9e9ac8', '#756bb1', '#54278f'],
  },
  rdylgn: {
    id: 'rdylgn',
    name: '紅黃綠警示 (RdYlGn)',
    type: 'diverging',
    colors: ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850'],
  },
  rdbu: {
    id: 'rdbu',
    name: '紅白藍對比 (RdBu)',
    type: 'diverging',
    colors: ['#b2182b', '#ef8a62', '#fddbc7', '#d1e5f0', '#67a9cf', '#2166ac'],
  },
  spectral: {
    id: 'spectral',
    name: '全光譜色彩 (Spectral)',
    type: 'diverging',
    colors: ['#9e0142', '#d53e4f', '#fee08b', '#e6f598', '#66c2a5', '#5e4fa2'],
  },
};

// Generate n colors from base palette with optional reverse
export function getInterpolatedColors(paletteId: PaletteId, classes: number, reversed = false): string[] {
  const basePalette = COLOR_PALETTES[paletteId] || COLOR_PALETTES.viridis;
  const rawColors = reversed ? [...basePalette.colors].reverse() : [...basePalette.colors];

  if (classes === rawColors.length) {
    return rawColors;
  }

  // Linear sampling from color ramp
  const sampled: string[] = [];
  for (let i = 0; i < classes; i++) {
    const t = classes === 1 ? 0.5 : i / (classes - 1);
    const index = Math.min(rawColors.length - 1, Math.floor(t * (rawColors.length - 1)));
    const nextIndex = Math.min(rawColors.length - 1, index + 1);
    const frac = t * (rawColors.length - 1) - index;

    sampled.push(interpolateHex(rawColors[index], rawColors[nextIndex], frac));
  }

  return sampled;
}

// Simple hex color linear interpolation
function interpolateHex(color1: string, color2: string, factor: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  if (!c1 || !c2) return color1;

  const r = Math.round(c1.r + factor * (c2.r - c1.r));
  const g = Math.round(c1.g + factor * (c2.g - c1.g));
  const b = Math.round(c1.b + factor * (c2.b - c1.b));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6 && clean.length !== 3) return null;
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Implementation of Jenks Natural Breaks algorithm
export function calculateJenksBreaks(data: number[], numClasses: number): number[] {
  if (data.length === 0) return [];
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  const k = Math.min(numClasses, n);

  if (k <= 1 || sorted[0] === sorted[n - 1]) {
    return [sorted[0], sorted[n - 1]];
  }

  const mat1: number[][] = Array.from({ length: n + 1 }, () => Array(k + 1).fill(0));
  const mat2: number[][] = Array.from({ length: n + 1 }, () => Array(k + 1).fill(0));

  for (let y = 1; y <= k; y++) {
    mat1[1][y] = 1;
    mat2[1][y] = 0;
    for (let t = 2; t <= n; t++) {
      mat2[t][y] = Infinity;
    }
  }

  let v = 0;
  for (let l = 2; l <= n; l++) {
    let s1 = 0;
    let s2 = 0;
    let w = 0;
    for (let m = 1; m <= l; m++) {
      const i3 = l - m + 1;
      const val = sorted[i3 - 1];
      s2 += val * val;
      s1 += val;
      w += 1;
      v = s2 - (s1 * s1) / w;
      const i4 = i3 - 1;
      if (i4 !== 0) {
        for (let j = 2; j <= k; j++) {
          if (mat2[l][j] >= v + mat2[i4][j - 1]) {
            mat1[l][j] = i3;
            mat2[l][j] = v + mat2[i4][j - 1];
          }
        }
      }
    }
    mat1[l][1] = 1;
    mat2[l][1] = v;
  }

  let countNum = n;
  const kclass: number[] = Array(k + 1).fill(0);
  kclass[k] = sorted[n - 1];
  kclass[0] = sorted[0];

  for (let count = k; count >= 2; count--) {
    const id = mat1[countNum][count] - 2;
    kclass[count - 1] = sorted[id];
    countNum = mat1[countNum][count] - 1;
  }

  // Remove duplicates and ensure monotonic order
  return Array.from(new Set(kclass)).sort((a, b) => a - b);
}

// Build legend breaks given values and classification config
export function generateLegendBreaks(
  values: number[],
  numClasses: number,
  method: ClassificationMethod,
  paletteId: PaletteId,
  reversed = false
): LegendBreak[] {
  if (values.length === 0) return [];

  const cleanValues = values.filter((v) => !isNaN(v) && isFinite(v));
  if (cleanValues.length === 0) return [];

  const sorted = [...cleanValues].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  const actualClasses = Math.max(2, Math.min(numClasses, cleanValues.length));
  const colors = getInterpolatedColors(paletteId, actualClasses, reversed);

  let thresholds: number[] = [];

  if (min === max) {
    return [
      {
        min,
        max,
        label: formatNumber(min),
        color: colors[0],
        count: cleanValues.length,
      },
    ];
  }

  switch (method) {
    case 'quantile': {
      const qScale = scaleQuantile<number>()
        .domain(sorted)
        .range(Array.from({ length: actualClasses }, (_, i) => i));
      thresholds = [min, ...qScale.quantiles(), max];
      break;
    }
    case 'equalInterval': {
      const step = (max - min) / actualClasses;
      thresholds = Array.from({ length: actualClasses + 1 }, (_, i) => min + i * step);
      thresholds[thresholds.length - 1] = max;
      break;
    }
    case 'jenks': {
      thresholds = calculateJenksBreaks(sorted, actualClasses);
      if (thresholds.length < 2) {
        thresholds = [min, max];
      }
      break;
    }
    case 'logarithmic': {
      const shift = min <= 0 ? Math.abs(min) + 1 : 0;
      const logMin = Math.log10(min + shift);
      const logMax = Math.log10(max + shift);
      const logStep = (logMax - logMin) / actualClasses;
      thresholds = Array.from(
        { length: actualClasses + 1 },
        (_, i) => Math.pow(10, logMin + i * logStep) - shift
      );
      thresholds[0] = min;
      thresholds[thresholds.length - 1] = max;
      break;
    }
  }

  // Deduplicate and ensure at least 2 thresholds
  const dedupThresholds = Array.from(new Set(thresholds)).sort((a, b) => a - b);
  if (dedupThresholds.length <= 1) {
    dedupThresholds.push(max);
  }

  const effectiveCount = dedupThresholds.length - 1;
  const breakColors = getInterpolatedColors(paletteId, effectiveCount, reversed);

  const breaks: LegendBreak[] = [];
  for (let i = 0; i < effectiveCount; i++) {
    const bMin = dedupThresholds[i];
    const bMax = dedupThresholds[i + 1];

    // Count how many values fall into this interval
    const inRange = cleanValues.filter((v) => {
      if (i === effectiveCount - 1) {
        return v >= bMin && v <= bMax;
      }
      return v >= bMin && v < bMax;
    });

    breaks.push({
      min: bMin,
      max: bMax,
      label: `${formatNumber(bMin)} - ${formatNumber(bMax)}`,
      color: breakColors[i],
      count: inRange.length,
    });
  }

  return breaks;
}

// Find color for a given numeric value
export function getColorForValue(
  value: number | null | undefined,
  breaks: LegendBreak[],
  fallbackColor = '#334155'
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return fallbackColor;
  }
  for (let i = 0; i < breaks.length; i++) {
    const b = breaks[i];
    if (i === breaks.length - 1) {
      if (value >= b.min && value <= b.max) return b.color;
    } else {
      if (value >= b.min && value < b.max) return b.color;
    }
  }
  return fallbackColor;
}

// Clean number formatting for tooltips and legends
export function formatNumber(val: number): string {
  if (val === null || val === undefined || isNaN(val)) return '-';
  const abs = Math.abs(val);
  if (abs >= 1000000000) {
    return `${(val / 1000000000).toFixed(1)}B`;
  }
  if (abs >= 1000000) {
    return `${(val / 1000000).toFixed(1)}M`;
  }
  if (abs >= 10000) {
    return `${(val / 10000).toFixed(1)}萬`;
  }
  if (abs >= 1000) {
    return val.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  if (abs < 0.01 && abs > 0) {
    return val.toExponential(2);
  }
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
