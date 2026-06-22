import { describe, expect, it } from 'vitest'
import {
  buildSymmetricWaveformPath,
  computeWaveformPeakPairs,
  computeWaveformPeaks,
  resampleWaveformPeaks,
} from './waveformPeaks'

describe('computeWaveformPeakPairs', () => {
  it('returns normalized min/max pairs', () => {
    const samples = new Float32Array([0, 0.5, -1, 0.25, 0, 0.75])
    const pairs = computeWaveformPeakPairs(samples, 3)

    expect(pairs).toHaveLength(3)
    expect(Math.max(...pairs.map((pair) => Math.max(pair.max, Math.abs(pair.min))))).toBe(1)
    expect(Math.min(...pairs.map((pair) => pair.min))).toBeGreaterThanOrEqual(-1)
  })

  it('returns empty array for empty input', () => {
    expect(computeWaveformPeakPairs(new Float32Array(), 8)).toEqual([])
  })
})

describe('computeWaveformPeaks', () => {
  it('returns normalized peaks between 0 and 1', () => {
    const samples = new Float32Array([0, 0.5, -1, 0.25, 0, 0.75])
    const peaks = computeWaveformPeaks(samples, 3)

    expect(peaks).toHaveLength(3)
    expect(Math.max(...peaks)).toBeLessThanOrEqual(1)
    expect(Math.max(...peaks)).toBeGreaterThan(0)
    expect(Math.min(...peaks)).toBeGreaterThanOrEqual(0)
  })
})

describe('resampleWaveformPeaks', () => {
  it('downsamples to the requested count', () => {
    const pairs = computeWaveformPeakPairs(new Float32Array([0, 1, -1, 0.5, -0.5, 0.25]), 6)
    expect(resampleWaveformPeaks(pairs, 2)).toHaveLength(2)
  })
})

describe('buildSymmetricWaveformPath', () => {
  it('returns a closed SVG path', () => {
    const pairs = computeWaveformPeakPairs(new Float32Array([0, 1, -1, 0.5, -0.5, 0.25]), 6)
    const path = buildSymmetricWaveformPath(pairs, 120, 40)

    expect(path.startsWith('M')).toBe(true)
    expect(path.endsWith('Z')).toBe(true)
  })
})
