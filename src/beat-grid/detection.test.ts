import { describe, expect, it } from 'vitest'
import { detectBeatGrid } from './detection'

/** Synthesize a mono click track: impulses every `period` samples starting at `offsetSec`. */
function generateClickTrack(
  bpm: number,
  offsetSecs: number,
  durationSecs: number,
  sampleRate: number,
): Float32Array {
  const samples = new Float32Array(Math.ceil(durationSecs * sampleRate))
  const beatIntervalSamples = (60 / bpm) * sampleRate
  let pos = offsetSecs * sampleRate
  while (pos < samples.length) {
    const idx = Math.round(pos)
    // Short exponential-decay click so energy is detectable within a hop window
    for (let j = 0; j < 32 && idx + j < samples.length; j++) {
      samples[idx + j] += Math.pow(0.7, j)
    }
    pos += beatIntervalSamples
  }
  return samples
}

describe('detectBeatGrid — BPM accuracy', () => {
  it('detects BPM within ±2% from a 120 BPM synthesized click track', () => {
    const sampleRate = 44100
    const bpm = 120
    const samples = generateClickTrack(bpm, 0.1, 10, sampleRate)
    const grid = detectBeatGrid(samples, sampleRate)
    expect(grid.bpm / bpm).toBeGreaterThan(0.98)
    expect(grid.bpm / bpm).toBeLessThan(1.02)
  })

  it('detects BPM within ±2% from a 90 BPM synthesized click track', () => {
    const sampleRate = 44100
    const bpm = 90
    const samples = generateClickTrack(bpm, 0.05, 10, sampleRate)
    const grid = detectBeatGrid(samples, sampleRate)
    expect(grid.bpm / bpm).toBeGreaterThan(0.98)
    expect(grid.bpm / bpm).toBeLessThan(1.02)
  })
})

describe('detectBeatGrid — first beat offset accuracy', () => {
  it('detects first beat offset within ±30ms', () => {
    const sampleRate = 44100
    const bpm = 120
    const offsetSecs = 0.1
    const samples = generateClickTrack(bpm, offsetSecs, 10, sampleRate)
    const grid = detectBeatGrid(samples, sampleRate)
    expect(Math.abs(grid.firstBeatOffsetSecs - offsetSecs)).toBeLessThan(0.030)
  })

  it('detects near-zero offset within ±30ms', () => {
    const sampleRate = 44100
    const bpm = 120
    const offsetSecs = 0.02
    const samples = generateClickTrack(bpm, offsetSecs, 10, sampleRate)
    const grid = detectBeatGrid(samples, sampleRate)
    expect(Math.abs(grid.firstBeatOffsetSecs - offsetSecs)).toBeLessThan(0.030)
  })
})

describe('detectBeatGrid — beat interval', () => {
  it('returns beatIntervalSecs consistent with detected BPM', () => {
    const sampleRate = 44100
    const bpm = 120
    const samples = generateClickTrack(bpm, 0.1, 10, sampleRate)
    const grid = detectBeatGrid(samples, sampleRate)
    expect(Math.abs(grid.beatIntervalSecs - 60 / grid.bpm)).toBeLessThan(0.001)
  })
})
