import { describe, expect, it } from 'vitest'
import { DEFAULT_GLOBAL_SETTINGS } from '../timeline-core'
import type { MediaSlide } from '../timeline-core/types'
import { SCHEMA_VERSION } from '../project-store'
import type { JamendoAttribution } from '../jamendo/types'
import type { BeatGrid } from '../beat-grid/types'
import { slidesToJson } from './slidePersistence'

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
  it('includes soundtrackFilename when a soundtrack is selected', () => {
    const json = slidesToJson(DEFAULT_GLOBAL_SETTINGS, [makeSlide('a.jpg')], 'theme.mp3')
    expect(json.soundtrackFilename).toBe('theme.mp3')
    expect(json.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('omits soundtrackFilename when none is selected', () => {
    const json = slidesToJson(DEFAULT_GLOBAL_SETTINGS, [makeSlide('a.jpg')], null)
    expect(json.soundtrackFilename).toBeUndefined()
  })

  it('includes themeName when a theme is active', () => {
    const json = slidesToJson(DEFAULT_GLOBAL_SETTINGS, [makeSlide('a.jpg')], null, 'classic')
    expect(json.themeName).toBe('classic')
  })

  it('omits themeName when null', () => {
    const json = slidesToJson(DEFAULT_GLOBAL_SETTINGS, [makeSlide('a.jpg')], null, null)
    expect(json.themeName).toBeUndefined()
  })

  it('includes soundtrackAttribution when provided', () => {
    const attribution: JamendoAttribution = {
      jamendoId: '123',
      name: 'Great Track',
      artist: 'Cool Artist',
      licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    }
    const json = slidesToJson(DEFAULT_GLOBAL_SETTINGS, [makeSlide('a.jpg')], 'track.mp3', null, attribution)
    expect(json.soundtrackAttribution).toEqual(attribution)
  })

  it('omits soundtrackAttribution when null', () => {
    const json = slidesToJson(DEFAULT_GLOBAL_SETTINGS, [makeSlide('a.jpg')], 'track.mp3', null, null)
    expect(json.soundtrackAttribution).toBeUndefined()
  })

  it('includes aspectRatio when provided', () => {
    const json = slidesToJson(DEFAULT_GLOBAL_SETTINGS, [makeSlide('a.jpg')], null, null, null, '9:16')
    expect(json.aspectRatio).toBe('9:16')
  })

  it('omits aspectRatio when not provided', () => {
    const json = slidesToJson(DEFAULT_GLOBAL_SETTINGS, [makeSlide('a.jpg')], null, null, null)
    expect(json.aspectRatio).toBeUndefined()
  })

  it('includes beatGridCache when provided', () => {
    const json = slidesToJson(DEFAULT_GLOBAL_SETTINGS, [makeSlide('a.jpg')], 'track.mp3', null, null, null, BEAT_GRID)
    expect(json.beatGridCache).toEqual(BEAT_GRID)
  })

  it('includes manualBeatGrid when provided', () => {
    const json = slidesToJson(DEFAULT_GLOBAL_SETTINGS, [makeSlide('a.jpg')], 'track.mp3', null, null, null, null, BEAT_GRID)
    expect(json.manualBeatGrid).toEqual(BEAT_GRID)
  })

  it('omits beat grid fields when not provided', () => {
    const json = slidesToJson(DEFAULT_GLOBAL_SETTINGS, [makeSlide('a.jpg')], 'track.mp3')
    expect(json.beatGridCache).toBeUndefined()
    expect(json.manualBeatGrid).toBeUndefined()
  })
})
