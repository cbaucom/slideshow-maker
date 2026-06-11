import { describe, expect, it } from 'vitest'
import { resolveEffectiveBeatGrid } from './manual'
import type { BeatGrid } from './types'

const AUTO: BeatGrid = { bpm: 118, beatIntervalSecs: 60 / 118, firstBeatOffsetSecs: 0.05 }
const MANUAL: BeatGrid = { bpm: 120, beatIntervalSecs: 0.5, firstBeatOffsetSecs: 0.1 }

describe('resolveEffectiveBeatGrid — priority (AC2)', () => {
  it('returns manual grid when both manual and cache are present', () => {
    const result = resolveEffectiveBeatGrid(MANUAL, AUTO)
    expect(result).toEqual(MANUAL)
  })

  it('returns auto-detected cache when no manual override is set', () => {
    const result = resolveEffectiveBeatGrid(undefined, AUTO)
    expect(result).toEqual(AUTO)
  })

  it('returns undefined when neither manual nor cache exists', () => {
    const result = resolveEffectiveBeatGrid(undefined, undefined)
    expect(result).toBeUndefined()
  })

  it('manual still wins after cache is updated (re-analysis does not override manual)', () => {
    const updatedCache: BeatGrid = { bpm: 115, beatIntervalSecs: 60 / 115, firstBeatOffsetSecs: 0.02 }
    // Simulate re-analysis: cache changes but manual stays
    const result = resolveEffectiveBeatGrid(MANUAL, updatedCache)
    expect(result).toEqual(MANUAL)
    expect(result?.bpm).toBe(120)
  })

  it('returns cache once manual is cleared', () => {
    // Simulate clearing: pass undefined for manual
    const result = resolveEffectiveBeatGrid(undefined, AUTO)
    expect(result).toEqual(AUTO)
  })
})
