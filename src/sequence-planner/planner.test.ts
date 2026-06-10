import { describe, expect, it } from 'vitest'
import { plan, TRANSITION_FRAMES } from './planner'
import type { GlobalSettings } from '../timeline-core/settings'
import { DEFAULT_GLOBAL_SETTINGS } from '../timeline-core/settings'
import type { MediaSlide } from '../timeline-core/types'

function makeSlide(id: string, type: 'image' | 'video', durationInFrames: number): MediaSlide {
  return { id, filename: `${id}.${type === 'image' ? 'jpg' : 'mp4'}`, type, durationInFrames, blobUrl: '', excluded: false }
}

const IMG_90 = makeSlide('a', 'image', 90)
const IMG_90B = makeSlide('b', 'image', 90)
const VID_120 = makeSlide('c', 'video', 120)

const CROSSFADE: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, transitionType: 'crossfade' }
const DIP: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, transitionType: 'dip-to-black' }
const CUT: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, transitionType: 'cut' }

// --- Golden snapshot: 3 slides, crossfade ---

describe('plan — crossfade golden snapshot', () => {
  it('produces correct frame positions and windows for 3 slides', () => {
    const result = plan([IMG_90, IMG_90B, VID_120], CROSSFADE)

    expect(result.totalFrames).toBe(90 + 90 + 120 - 2 * 15)  // 270

    expect(result.entries).toHaveLength(3)

    const [e0, e1, e2] = result.entries

    expect(e0.startFrame).toBe(0)
    expect(e0.durationInFrames).toBe(90)
    expect(e0.transitionIn).toBeUndefined()

    expect(e1.startFrame).toBe(75)
    expect(e1.durationInFrames).toBe(90)
    expect(e1.transitionIn).toEqual({ type: 'crossfade', durationInFrames: 15 })

    expect(e2.startFrame).toBe(150)
    expect(e2.durationInFrames).toBe(120)
    expect(e2.transitionIn).toEqual({ type: 'crossfade', durationInFrames: 15 })
  })
})

// --- Edge cases ---

describe('plan — edge cases', () => {
  it('returns empty plan for no slides', () => {
    const result = plan([], CROSSFADE)
    expect(result.entries).toHaveLength(0)
    expect(result.totalFrames).toBe(0)
  })

  it('returns single entry with no transition for one slide', () => {
    const result = plan([IMG_90], CROSSFADE)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].startFrame).toBe(0)
    expect(result.entries[0].durationInFrames).toBe(90)
    expect(result.entries[0].transitionIn).toBeUndefined()
    expect(result.totalFrames).toBe(90)
  })
})

// --- Cut transition ---

describe('plan — cut transition', () => {
  it('produces no-overlap positions for hard cut', () => {
    const result = plan([IMG_90, IMG_90B, VID_120], CUT)

    expect(result.totalFrames).toBe(90 + 90 + 120)  // 300, no overlap

    const [e0, e1, e2] = result.entries
    expect(e0.startFrame).toBe(0)
    expect(e1.startFrame).toBe(90)
    expect(e1.transitionIn).toEqual({ type: 'cut', durationInFrames: 0 })
    expect(e2.startFrame).toBe(180)
    expect(e2.transitionIn).toEqual({ type: 'cut', durationInFrames: 0 })
  })
})

// --- Dip-to-black transition ---

describe('plan — dip-to-black transition', () => {
  it('uses 30-frame transition duration', () => {
    const result = plan([IMG_90, IMG_90B, VID_120], DIP)

    expect(TRANSITION_FRAMES['dip-to-black']).toBe(30)
    expect(result.totalFrames).toBe(90 + 90 + 120 - 2 * 30)  // 240

    const [e0, e1, e2] = result.entries
    expect(e0.startFrame).toBe(0)
    expect(e1.startFrame).toBe(60)
    expect(e1.transitionIn).toEqual({ type: 'dip-to-black', durationInFrames: 30 })
    expect(e2.startFrame).toBe(120)
    expect(e2.transitionIn).toEqual({ type: 'dip-to-black', durationInFrames: 30 })
  })
})

// --- mediaMetadata override ---

describe('plan — mediaMetadata duration override', () => {
  it('uses metadata durationInFrames for matching slide filename', () => {
    const meta = new Map([['c.mp4', { durationInFrames: 150 }]])
    const result = plan([IMG_90, VID_120], CROSSFADE, meta)

    // VID_120.filename = 'c.mp4' → overridden to 150
    expect(result.entries[1].durationInFrames).toBe(150)
    expect(result.totalFrames).toBe(90 + 150 - 15)  // 225
  })
})

// --- Property tests (table-driven) ---

describe('plan — properties', () => {
  const cases: Array<{ label: string; settings: GlobalSettings; durations: number[] }> = [
    { label: 'crossfade 2 slides', settings: CROSSFADE, durations: [60, 90] },
    { label: 'crossfade 4 slides', settings: CROSSFADE, durations: [90, 90, 90, 90] },
    { label: 'cut 3 slides', settings: CUT, durations: [50, 100, 75] },
    { label: 'dip-to-black 3 slides', settings: DIP, durations: [90, 90, 90] },
    { label: 'single slide', settings: CROSSFADE, durations: [120] },
  ]

  for (const { label, settings, durations } of cases) {
    const slides = durations.map((d, i) => makeSlide(`s${i}`, 'image', d))
    const transitionDur = TRANSITION_FRAMES[settings.transitionType]
    const n = slides.length

    it(`totalFrames consistent with parts — ${label}`, () => {
      const result = plan(slides, settings)
      const expected = durations.reduce((a, b) => a + b, 0) - Math.max(0, n - 1) * transitionDur
      expect(result.totalFrames).toBe(expected)
    })

    it(`first entry startFrame is 0 — ${label}`, () => {
      const result = plan(slides, settings)
      if (result.entries.length > 0) expect(result.entries[0].startFrame).toBe(0)
    })

    it(`startFrames advance correctly — ${label}`, () => {
      const result = plan(slides, settings)
      for (let i = 1; i < result.entries.length; i++) {
        const prev = result.entries[i - 1]
        const curr = result.entries[i]
        expect(curr.startFrame).toBe(prev.startFrame + prev.durationInFrames - transitionDur)
      }
    })

    it(`transition windows only span adjacent slides — ${label}`, () => {
      const result = plan(slides, settings)
      for (let i = 1; i < result.entries.length; i++) {
        const curr = result.entries[i]
        expect(curr.transitionIn?.type).toBe(settings.transitionType)
        expect(curr.transitionIn?.durationInFrames).toBe(transitionDur)
      }
      expect(result.entries[0].transitionIn).toBeUndefined()
    })
  }
})
