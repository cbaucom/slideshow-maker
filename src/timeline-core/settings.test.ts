import { describe, it, expect } from 'vitest'
import {
  resolve,
  applyImageDuration,
  DEFAULT_GLOBAL_SETTINGS,
} from './settings'
import type { GlobalSettings } from './settings'
import type { MediaSlide } from './types'
import { createTitleSlide } from './timeline'

function imgSlide(id: string, durationInFrames = 90): MediaSlide {
  return { id, filename: `${id}.jpg`, type: 'image', blobUrl: '', durationInFrames, excluded: false }
}
function vidSlide(id: string, durationInFrames = 150): MediaSlide {
  return { id, filename: `${id}.mp4`, type: 'video', blobUrl: '', durationInFrames, excluded: false }
}

// --- resolve ---

describe('resolve: global only (no overrides)', () => {
  it('returns global values when no overrides provided', () => {
    const r = resolve(DEFAULT_GLOBAL_SETTINGS)
    expect(r.imageDurationSecs).toBe(DEFAULT_GLOBAL_SETTINGS.imageDurationSecs)
    expect(r.transitionType).toBe(DEFAULT_GLOBAL_SETTINGS.transitionType)
    expect(r.kenBurns).toBe(DEFAULT_GLOBAL_SETTINGS.kenBurns)
    expect(r.fitMode).toBe(DEFAULT_GLOBAL_SETTINGS.fitMode)
  })

  it('returns global values when empty overrides object provided', () => {
    const r = resolve(DEFAULT_GLOBAL_SETTINGS, {})
    expect(r.imageDurationSecs).toBe(DEFAULT_GLOBAL_SETTINGS.imageDurationSecs)
  })
})

describe('resolve: override wins', () => {
  it('slide imageDurationSecs overrides global', () => {
    const r = resolve(DEFAULT_GLOBAL_SETTINGS, { imageDurationSecs: 7 })
    expect(r.imageDurationSecs).toBe(7)
  })

  it('slide transitionType overrides global', () => {
    const r = resolve(DEFAULT_GLOBAL_SETTINGS, { transitionType: 'cut' })
    expect(r.transitionType).toBe('cut')
  })

  it('slide kenBurns false overrides global true', () => {
    const global: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, kenBurns: true }
    const r = resolve(global, { kenBurns: false })
    expect(r.kenBurns).toBe(false)
  })

  it('slide fitMode overrides global', () => {
    const r = resolve(DEFAULT_GLOBAL_SETTINGS, { fitMode: 'contain' })
    expect(r.fitMode).toBe('contain')
  })

  it('partial override: only specified fields override, rest use global', () => {
    const global: GlobalSettings = {
      imageDurationSecs: 3,
      transitionType: 'crossfade',
      kenBurns: true,
      fitMode: 'cover',
    }
    const r = resolve(global, { imageDurationSecs: 8, fitMode: 'blur-fill' })
    expect(r.imageDurationSecs).toBe(8)
    expect(r.transitionType).toBe('crossfade') // global wins
    expect(r.kenBurns).toBe(true)              // global wins
    expect(r.fitMode).toBe('blur-fill')
  })
})

describe('resolve: table-driven cascade', () => {
  const cases: Array<[Partial<GlobalSettings>, keyof GlobalSettings, GlobalSettings[keyof GlobalSettings]]> = [
    [{ imageDurationSecs: 5 }, 'imageDurationSecs', 5],
    [{ transitionType: 'dip-to-black' }, 'transitionType', 'dip-to-black'],
    [{ kenBurns: false }, 'kenBurns', false],
    [{ fitMode: 'blur-fill' }, 'fitMode', 'blur-fill'],
  ]
  it.each(cases)('override %o: field %s → %s', (overrides, field, expected) => {
    const r = resolve(DEFAULT_GLOBAL_SETTINGS, overrides)
    expect(r[field]).toBe(expected)
  })
})

// --- applyImageDuration ---

describe('applyImageDuration', () => {
  it('updates durationInFrames for image slides to secs * 30', () => {
    const slides = [imgSlide('a'), imgSlide('b')]
    const result = applyImageDuration(slides, 5)
    expect(result[0].durationInFrames).toBe(150)
    expect(result[1].durationInFrames).toBe(150)
  })

  it('does not change video slide durations', () => {
    const slides = [imgSlide('a'), vidSlide('v', 240)]
    const result = applyImageDuration(slides, 5)
    expect(result[1].durationInFrames).toBe(240) // unchanged
  })

  it('does not mutate the input array', () => {
    const slides = [imgSlide('a')]
    applyImageDuration(slides, 5)
    expect(slides[0].durationInFrames).toBe(90)
  })

  it('fractional seconds round to nearest frame', () => {
    const slides = [imgSlide('a')]
    const result = applyImageDuration(slides, 2.5)
    expect(result[0].durationInFrames).toBe(75) // 2.5 * 30
  })

  it('does not change title slide durations', () => {
    const t = createTitleSlide('t', 'Title')
    const result = applyImageDuration([t], 5)
    expect(result[0].durationInFrames).toBe(90) // unchanged
  })

  it('skips image slides that have an imageDurationSecs per-slide override', () => {
    const overridden: MediaSlide = { ...imgSlide('a', 90), overrides: { imageDurationSecs: 8 } }
    const result = applyImageDuration([overridden], 3)
    expect(result[0].durationInFrames).toBe(90) // unchanged; planner uses overrides.imageDurationSecs
  })
})
