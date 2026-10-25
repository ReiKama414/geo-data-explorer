import { describe, it, expect } from 'vitest';
import {
  generateLegendBreaks,
  calculateJenksBreaks,
  getColorForValue,
  formatNumber,
  getInterpolatedColors,
} from './colorScales';

describe('Color Scales & Classification Unit Tests', () => {
  const sampleValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  it('generates valid breaks using equal interval method', () => {
    const breaks = generateLegendBreaks(sampleValues, 5, 'equalInterval', 'blues');
    expect(breaks.length).toBe(5);
    expect(breaks[0].min).toBe(10);
    expect(breaks[4].max).toBe(100);
    expect(breaks.every((b) => Boolean(b.color))).toBe(true);
  });

  it('generates valid breaks using quantile method', () => {
    const breaks = generateLegendBreaks(sampleValues, 5, 'quantile', 'greens');
    expect(breaks.length).toBe(5);
    // In quantiles with 10 items and 5 classes, each break should have approx 2 items
    const totalCount = breaks.reduce((acc, b) => acc + b.count, 0);
    expect(totalCount).toBe(10);
  });

  it('calculates jenks natural breaks correctly', () => {
    const clusteredValues = [1, 2, 2, 3, 20, 21, 22, 50, 51, 52];
    const jenks = calculateJenksBreaks(clusteredValues, 3);
    expect(jenks.length).toBeGreaterThanOrEqual(2);
    expect(jenks[0]).toBe(1);
    expect(jenks[jenks.length - 1]).toBe(52);
  });

  it('handles logarithmic classification for skewed data', () => {
    const skewedValues = [1, 10, 100, 1000, 10000];
    const breaks = generateLegendBreaks(skewedValues, 4, 'logarithmic', 'viridis');
    expect(breaks.length).toBe(4);
    expect(breaks[0].min).toBe(1);
    expect(breaks[3].max).toBe(10000);
  });

  it('maps numeric value to correct color break', () => {
    const breaks = generateLegendBreaks(sampleValues, 5, 'equalInterval', 'viridis');
    const colorLow = getColorForValue(15, breaks);
    const colorHigh = getColorForValue(95, breaks);
    expect(colorLow).not.toBe(colorHigh);
    expect(colorLow).toBe(breaks[0].color);
    expect(colorHigh).toBe(breaks[4].color);

    // Unmatched / null returns fallback
    const fallback = getColorForValue(null, breaks, '#fallback');
    expect(fallback).toBe('#fallback');
  });

  it('formats numbers concisely for map tooltips and legends', () => {
    expect(formatNumber(1200000)).toBe('1.2M');
    expect(formatNumber(35000)).toBe('3.5萬');
    expect(formatNumber(850.5)).toBe('850.5');
    expect(formatNumber(NaN)).toBe('-');
  });

  it('reverses palette colors when requested', () => {
    const normal = getInterpolatedColors('blues', 5, false);
    const reversed = getInterpolatedColors('blues', 5, true);
    expect(normal[0]).toBe(reversed[reversed.length - 1]);
    expect(normal[normal.length - 1]).toBe(reversed[0]);
  });
});
