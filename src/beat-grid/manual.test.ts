import { describe, expect, it } from 'vitest'
import { resolveEffectiveBeatGrid } from './manual'
import type { BeatGrid, BeatGridCache } from './types'

const AUTO: BeatGrid = { bpm: 118, beatIntervalSecs: 60 / 118, firstBeatOffsetSecs: 0.05 }
const MANUAL: BeatGrid = { bpm: 120, beatIntervalSecs: 0.5, firstBeatOffsetSecs: 0.1 }

describe('resolveEffectiveBeatGrid — priority', () => {
  const cache: BeatGridCache = { 'track.mp3': AUTO }

  it('returns manual grid when both manual and cache are present', () => {
    expect(resolveEffectiveBeatGrid(MANUAL, cache)).toEqual(MANUAL)
  })

  it('returns auto-detected cache when no manual override is set', () => {
    expect(resolveEffectiveBeatGrid(undefined, cache)).toEqual(AUTO)
  })

  it('returns undefined when neither manual nor cache exists', () => {
    expect(resolveEffectiveBeatGrid(undefined, undefined)).toBeUndefined()
  })

  it('manual still wins after cache is updated', () => {
    const updatedCache: BeatGridCache = {
      'track.mp3': { bpm: 115, beatIntervalSecs: 60 / 115, firstBeatOffsetSecs: 0.02 },
    }
    expect(resolveEffectiveBeatGrid(MANUAL, updatedCache)).toEqual(MANUAL)
  })

  it('returns cache once manual is cleared', () => {
    expect(resolveEffectiveBeatGrid(undefined, cache)).toEqual(AUTO)
  })
})
