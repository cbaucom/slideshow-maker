import { describe, expect, it } from 'vitest'
import { tapToBpm, manualBeatGridFromBpm } from './tap'

/** Generate perfect-tempo tap timestamps starting at `offsetMs`. */
function perfectTaps(count: number, bpm: number, offsetMs: number): number[] {
  const interval = (60 / bpm) * 1000
  return Array.from({ length: count }, (_, i) => offsetMs + i * interval)
}

describe('tapToBpm — BPM derivation (AC1)', () => {
  it('derives correct BPM from 8 perfectly-timed taps at 120 BPM', () => {
    const taps = perfectTaps(8, 120, 100)
    const grid = tapToBpm(taps)
    expect(grid.bpm).toBeCloseTo(120, 2)
  })

  it('derives correct BPM from 8 taps at 90 BPM', () => {
    const taps = perfectTaps(8, 90, 50)
    const grid = tapToBpm(taps)
    expect(grid.bpm).toBeCloseTo(90, 2)
  })

  it('uses median to be robust against one jittery tap', () => {
    // 7 perfect 500ms gaps (120 BPM) + 1 outlier (doubled gap)
    const taps = [0, 500, 1000, 1500, 2000, 2500, 3000, 4000] // last gap is 1000ms
    const grid = tapToBpm(taps)
    // Median of [500,500,500,500,500,500,1000] = 500 → 120 BPM
    expect(grid.bpm).toBeCloseTo(120, 1)
  })

  it('derives first beat offset from first tap position', () => {
    const taps = perfectTaps(8, 120, 100) // first tap at 100ms
    const grid = tapToBpm(taps)
    // 100ms % 500ms = 100ms → 0.1s
    expect(grid.firstBeatOffsetSecs).toBeCloseTo(0.1, 3)
  })

  it('normalises offset for taps starting deep into the track', () => {
    // First tap at 3050ms into track, 120 BPM (interval=500ms)
    // Phase within period: 3050 % 500 = 50ms → 0.05s
    const taps = perfectTaps(8, 120, 3050)
    const grid = tapToBpm(taps)
    expect(grid.firstBeatOffsetSecs).toBeCloseTo(0.05, 3)
  })

  it('returns beatIntervalSecs consistent with bpm', () => {
    const taps = perfectTaps(8, 120, 0)
    const grid = tapToBpm(taps)
    expect(Math.abs(grid.beatIntervalSecs - 60 / grid.bpm)).toBeLessThan(0.001)
  })

  it('throws for fewer than 8 taps', () => {
    expect(() => tapToBpm([])).toThrow()
    expect(() => tapToBpm([100, 200, 300])).toThrow()
    expect(() => tapToBpm(perfectTaps(7, 120, 0))).toThrow()
  })

  it('throws when median interval is zero (majority of timestamps identical)', () => {
    // 5 of 7 intervals are zero → median = 0 → guard fires
    const taps = [500, 500, 500, 500, 500, 500, 1000, 1500]
    expect(() => tapToBpm(taps)).toThrow()
  })
})

describe('manualBeatGridFromBpm — numeric entry (AC3)', () => {
  it('constructs BeatGrid from BPM and offset', () => {
    const grid = manualBeatGridFromBpm(120, 0.1)
    expect(grid.bpm).toBe(120)
    expect(grid.firstBeatOffsetSecs).toBe(0.1)
    expect(grid.beatIntervalSecs).toBeCloseTo(0.5, 4)
  })

  it('throws for non-positive BPM', () => {
    expect(() => manualBeatGridFromBpm(0, 0)).toThrow()
    expect(() => manualBeatGridFromBpm(-120, 0)).toThrow()
  })

  it('produces same BPM as tapToBpm with perfect taps (AC3)', () => {
    const taps = perfectTaps(8, 120, 100)
    const fromTaps = tapToBpm(taps)
    const fromNumeric = manualBeatGridFromBpm(120, 0.1)

    expect(fromTaps.bpm).toBeCloseTo(fromNumeric.bpm, 2)
    expect(fromTaps.firstBeatOffsetSecs).toBeCloseTo(fromNumeric.firstBeatOffsetSecs, 2)
    expect(fromTaps.beatIntervalSecs).toBeCloseTo(fromNumeric.beatIntervalSecs, 3)
  })
})
