import { describe, expect, it } from 'vitest'
import { buildConcatenatedBeatTimes } from './concat'
import { resolveConcatenatedBeatTimes } from './manual'
import type { BeatGrid, BeatGridCache } from './types'

const MANUAL: BeatGrid = { bpm: 120, beatIntervalSecs: 0.5, firstBeatOffsetSecs: 0.1 }
const FPS = 30

describe('buildConcatenatedBeatTimes', () => {
  it('shifts beat times by each clip start on the concatenated timeline', () => {
    const cache: BeatGridCache = {
      'a.mp3': { bpm: 120, beatIntervalSecs: 0.5, firstBeatOffsetSecs: 0 },
      'b.mp3': { bpm: 120, beatIntervalSecs: 0.5, firstBeatOffsetSecs: 0.1 },
    }
    const clips = [
      { filename: 'a.mp3', durationInFrames: 60 },
      { filename: 'b.mp3', durationInFrames: 60 },
    ]

    expect(buildConcatenatedBeatTimes(clips, cache, FPS)).toEqual([
      0,
      0.5,
      1,
      1.5,
      2.1,
      2.6,
      3.1,
      3.6,
    ])
  })
})

describe('resolveConcatenatedBeatTimes', () => {
  const clips = [
    { filename: 'a.mp3', durationInFrames: 60 },
    { filename: 'b.mp3', durationInFrames: 60 },
  ]

  it('uses manual grid across total audio duration', () => {
    const beatTimes = resolveConcatenatedBeatTimes(MANUAL, undefined, clips, FPS)
    expect(beatTimes?.[0]).toBe(0.1)
    expect(beatTimes?.at(-1)).toBeLessThan(4)
  })

  it('builds beat times from per-file cache when manual is absent', () => {
    const cache: BeatGridCache = {
      'a.mp3': { bpm: 120, beatIntervalSecs: 0.5, firstBeatOffsetSecs: 0 },
      'b.mp3': { bpm: 120, beatIntervalSecs: 0.5, firstBeatOffsetSecs: 0 },
    }
    const beatTimes = resolveConcatenatedBeatTimes(undefined, cache, clips, FPS)
    expect(beatTimes).toEqual(buildConcatenatedBeatTimes(clips, cache, FPS))
  })
})
