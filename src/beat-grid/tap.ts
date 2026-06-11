import type { BeatGrid } from './types'

/**
 * Derive a BeatGrid from an array of tap timestamps (ms from track start).
 * Uses median inter-tap interval for BPM — robust against a single mis-tap.
 * Requires at least 8 timestamps to match the acceptance-criteria minimum; fewer
 * taps leave the median with too little robustness to be reliable.
 */
export function tapToBpm(tapTimestampsMs: number[]): BeatGrid {
  if (tapTimestampsMs.length < 8) {
    throw new Error('tapToBpm requires at least 8 tap timestamps')
  }

  const intervals: number[] = []
  for (let i = 1; i < tapTimestampsMs.length; i++) {
    intervals.push(tapTimestampsMs[i] - tapTimestampsMs[i - 1])
  }

  const sorted = [...intervals].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const medianMs =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]

  if (medianMs <= 0) {
    throw new Error('tapToBpm: tap timestamps must be strictly increasing')
  }

  const bpm = 60000 / medianMs
  const beatIntervalSecs = medianMs / 1000
  const firstBeatOffsetSecs = (tapTimestampsMs[0] % medianMs) / 1000

  return { bpm, beatIntervalSecs, firstBeatOffsetSecs }
}

/**
 * Construct a BeatGrid from explicit BPM and first-beat offset.
 * Numerically equivalent to tapToBpm with perfectly-spaced taps at the same tempo.
 */
export function manualBeatGridFromBpm(bpm: number, firstBeatOffsetSecs: number): BeatGrid {
  if (bpm <= 0) {
    throw new Error('manualBeatGridFromBpm: bpm must be positive')
  }
  return {
    bpm,
    beatIntervalSecs: 60 / bpm,
    firstBeatOffsetSecs,
  }
}
