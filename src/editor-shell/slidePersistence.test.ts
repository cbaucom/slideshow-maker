import { describe, expect, it } from 'vitest'
import { DEFAULT_GLOBAL_SETTINGS } from '../timeline-core'
import type { MediaSlide } from '../timeline-core/types'
import { SCHEMA_VERSION, type SlideshowJson } from '../project-store'
import type { JamendoAttribution } from '../jamendo/types'
import type { BeatGrid } from '../beat-grid/types'
import { audioClipsFromJson, beatGridCacheFromJson, slidesToJson } from './slidePersistence'

const BEAT_GRID: BeatGrid = {
  beatIntervalSecs: 0.5,
  bpm: 120,
  firstBeatOffsetSecs: 0.1,
}

function makeSlide(filename: string): MediaSlide {
  return {
    blobUrl: 'blob:test',
    durationInFrames: 90,
    excluded: false,
    filename,
    id: `${filename}-1`,
    type: 'image',
  }
}

describe('slidesToJson', () => {
  it('includes audioClips when clips are in the playlist', () => {
    const json = slidesToJson(DEFAULT_GLOBAL_SETTINGS, [makeSlide('a.jpg')], [{ filename: 'theme.mp3' }])
    expect(json.audioClips).toEqual([{ filename: 'theme.mp3' }])
    expect(json.schemaVersion).toBe(SCHEMA_VERSION)
    expect(json.soundtrackFilename).toBeUndefined()
  })

  it('omits audioClips when playlist is empty', () => {
    const json = slidesToJson(DEFAULT_GLOBAL_SETTINGS, [makeSlide('a.jpg')], [])
    expect(json.audioClips).toBeUndefined()
  })

  it('includes themeName when a theme is active', () => {
    const json = slidesToJson(DEFAULT_GLOBAL_SETTINGS, [makeSlide('a.jpg')], [], 'classic')
    expect(json.themeName).toBe('classic')
  })

  it('omits themeName when null', () => {
    const json = slidesToJson(DEFAULT_GLOBAL_SETTINGS, [makeSlide('a.jpg')], [], null)
    expect(json.themeName).toBeUndefined()
  })

  it('includes soundtrackAttribution when provided', () => {
    const attribution: JamendoAttribution = {
      jamendoId: '123',
      name: 'Great Track',
      artist: 'Cool Artist',
      licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    }
    const json = slidesToJson(
      DEFAULT_GLOBAL_SETTINGS,
      [makeSlide('a.jpg')],
      [{ filename: 'track.mp3' }],
      null,
      attribution,
    )
    expect(json.soundtrackAttribution).toEqual(attribution)
  })

  it('omits soundtrackAttribution when null', () => {
    const json = slidesToJson(
      DEFAULT_GLOBAL_SETTINGS,
      [makeSlide('a.jpg')],
      [{ filename: 'track.mp3' }],
      null,
      null,
    )
    expect(json.soundtrackAttribution).toBeUndefined()
  })

  it('includes aspectRatio when provided', () => {
    const json = slidesToJson(DEFAULT_GLOBAL_SETTINGS, [makeSlide('a.jpg')], [], null, null, '9:16')
    expect(json.aspectRatio).toBe('9:16')
  })

  it('omits aspectRatio when not provided', () => {
    const json = slidesToJson(DEFAULT_GLOBAL_SETTINGS, [makeSlide('a.jpg')], [], null, null)
    expect(json.aspectRatio).toBeUndefined()
  })

  it('includes beatGridCache when provided', () => {
    const beatGridCache = { 'track.mp3': BEAT_GRID }
    const json = slidesToJson(
      DEFAULT_GLOBAL_SETTINGS,
      [makeSlide('a.jpg')],
      [{ filename: 'track.mp3' }],
      null,
      null,
      null,
      beatGridCache,
    )
    expect(json.beatGridCache).toEqual(beatGridCache)
  })

  it('includes manualBeatGrid when provided', () => {
    const json = slidesToJson(
      DEFAULT_GLOBAL_SETTINGS,
      [makeSlide('a.jpg')],
      [{ filename: 'track.mp3' }],
      null,
      null,
      null,
      null,
      BEAT_GRID,
    )
    expect(json.manualBeatGrid).toEqual(BEAT_GRID)
  })

  it('omits beat grid fields when not provided', () => {
    const json = slidesToJson(
      DEFAULT_GLOBAL_SETTINGS,
      [makeSlide('a.jpg')],
      [{ filename: 'track.mp3' }],
    )
    expect(json.beatGridCache).toBeUndefined()
    expect(json.manualBeatGrid).toBeUndefined()
  })

  it('includes loudnessCache when provided', () => {
    const json = slidesToJson(
      DEFAULT_GLOBAL_SETTINGS,
      [makeSlide('a.jpg')],
      [{ filename: 'track.mp3' }],
      null,
      null,
      null,
      null,
      null,
      { 'track.mp3': { byteLength: 42, offsetDb: -3 } },
    )
    expect(json.loudnessCache).toEqual({ 'track.mp3': { byteLength: 42, offsetDb: -3 } })
  })

  it('omits loudnessCache when empty', () => {
    const json = slidesToJson(
      DEFAULT_GLOBAL_SETTINGS,
      [makeSlide('a.jpg')],
      [{ filename: 'track.mp3' }],
      null,
      null,
      null,
      null,
      null,
      {},
    )
    expect(json.loudnessCache).toBeUndefined()
  })

  it('serializes gainDb on audio clips', () => {
    const json = slidesToJson(
      DEFAULT_GLOBAL_SETTINGS,
      [makeSlide('a.jpg')],
      [{ filename: 'a.mp3', gainDb: -3 }],
    )
    expect(json.audioClips).toEqual([{ filename: 'a.mp3', gainDb: -3 }])
  })
})

describe('audioClipsFromJson', () => {
  it('reads audioClips from saved json', () => {
    const clips = audioClipsFromJson({
      schemaVersion: 1,
      slides: [],
      audioClips: [{ filename: 'a.mp3' }, { filename: 'b.mp3' }],
    })
    expect(clips).toEqual([{ filename: 'a.mp3' }, { filename: 'b.mp3' }])
  })

  it('migrates soundtrackFilename to a single clip', () => {
    const clips = audioClipsFromJson({
      schemaVersion: 1,
      slides: [],
      soundtrackFilename: 'legacy.mp3',
    })
    expect(clips).toEqual([{ filename: 'legacy.mp3' }])
  })

  it('returns empty array when no audio is saved', () => {
    expect(audioClipsFromJson({ schemaVersion: 1, slides: [] })).toEqual([])
  })
})

describe('beatGridCacheFromJson', () => {
  it('reads per-file beatGridCache', () => {
    const cache = beatGridCacheFromJson({
      schemaVersion: 1,
      slides: [],
      audioClips: [{ filename: 'a.mp3' }],
      beatGridCache: { 'a.mp3': BEAT_GRID },
    })
    expect(cache).toEqual({ 'a.mp3': BEAT_GRID })
  })

  it('migrates legacy single BeatGrid to first clip filename', () => {
    const cache = beatGridCacheFromJson({
      schemaVersion: 1,
      slides: [],
      audioClips: [{ filename: 'theme.mp3' }],
      beatGridCache: BEAT_GRID,
    } as unknown as SlideshowJson)
    expect(cache).toEqual({ 'theme.mp3': BEAT_GRID })
  })

  it('migrates legacy BeatGrid using soundtrackFilename when no audioClips', () => {
    const cache = beatGridCacheFromJson({
      schemaVersion: 1,
      slides: [],
      soundtrackFilename: 'legacy.mp3',
      beatGridCache: BEAT_GRID,
    } as unknown as SlideshowJson)
    expect(cache).toEqual({ 'legacy.mp3': BEAT_GRID })
  })

  it('returns undefined when beatGridCache is absent', () => {
    expect(beatGridCacheFromJson({ schemaVersion: 1, slides: [] })).toBeUndefined()
  })
})
