import { describe, expect, it } from 'vitest'
import { nudge } from './nudge'
import type { BeatGrid } from './types'

// 120 BPM @ 30fps → beatFrames = 15
const GRID_120: BeatGrid = { bpm: 120, beatIntervalSecs: 0.5, firstBeatOffsetSecs: 0 }
const FPS = 30
const BEAT_F = 15 // frames per beat at 120 BPM / 30fps

describe('nudge — beat sync on, energy=medium (AC2)', () => {
  it('returns an exact beat multiple for an exact-beat target', () => {
    const result = nudge(90, GRID_120, 'medium', FPS) // 6 beats exactly
    expect(result % BEAT_F).toBe(0)
    expect(result).toBe(90)
  })

  it('snaps and deviation from passed target is ≤ half a beat interval', () => {
    // target=92 → nearest beat is 90 (6 beats), deviation=2 < 7.5
    const result = nudge(92, GRID_120, 'medium', FPS)
    expect(result % BEAT_F).toBe(0)
    expect(Math.abs(result - 92)).toBeLessThanOrEqual(BEAT_F / 2)
  })

  it('snaps up when target is closer to the next beat', () => {
    // target=99 → nearest beat is 105 (7 beats), deviation=6 < 7.5
    const result = nudge(99, GRID_120, 'medium', FPS)
    expect(result % BEAT_F).toBe(0)
    expect(Math.abs(result - 99)).toBeLessThanOrEqual(BEAT_F / 2)
  })

  it('snapped result always lands on a beat (is a multiple of beatFrames)', () => {
    for (const target of [60, 65, 72, 80, 90, 93, 99, 105]) {
      const result = nudge(target, GRID_120, 'medium', FPS)
      expect(result % BEAT_F).toBe(0)
    }
  })
})

describe('nudge — energy effect on average duration (AC4)', () => {
  it('calm produces longer average duration than punchy', () => {
    const targets = [60, 75, 90, 105, 120, 135, 150]
    const avg = (vals: number[]) => vals.reduce((a, b) => a + b, 0) / vals.length

    const calmResults = targets.map(t => nudge(t, GRID_120, 'calm', FPS))
    const punchyResults = targets.map(t => nudge(t, GRID_120, 'punchy', FPS))

    expect(avg(calmResults)).toBeGreaterThan(avg(punchyResults))
  })

  it('calm produces longer or equal average duration than medium', () => {
    const targets = [60, 75, 90, 105, 120]
    const avg = (vals: number[]) => vals.reduce((a, b) => a + b, 0) / vals.length

    const calmResults = targets.map(t => nudge(t, GRID_120, 'calm', FPS))
    const mediumResults = targets.map(t => nudge(t, GRID_120, 'medium', FPS))

    expect(avg(calmResults)).toBeGreaterThanOrEqual(avg(mediumResults))
  })

  it('punchy produces shorter or equal average duration than medium', () => {
    const targets = [60, 75, 90, 105, 120]
    const avg = (vals: number[]) => vals.reduce((a, b) => a + b, 0) / vals.length

    const punchyResults = targets.map(t => nudge(t, GRID_120, 'punchy', FPS))
    const mediumResults = targets.map(t => nudge(t, GRID_120, 'medium', FPS))

    expect(avg(punchyResults)).toBeLessThanOrEqual(avg(mediumResults))
  })
})

describe('nudge — minimum duration', () => {
  it('never returns zero or negative frames', () => {
    const result = nudge(1, GRID_120, 'punchy', FPS)
    expect(result).toBeGreaterThan(0)
  })
})
