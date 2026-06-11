import { describe, expect, it } from 'vitest'
import { plan, TRANSITION_FRAMES } from './planner'
import type { GlobalSettings } from '../timeline-core/settings'
import { DEFAULT_GLOBAL_SETTINGS } from '../timeline-core/settings'
import type { MediaSlide } from '../timeline-core/types'
import { createTitleSlide } from '../timeline-core/timeline'

function makeSlide(id: string, type: 'image' | 'video', durationInFrames: number): MediaSlide {
  return { id, filename: `${id}.${type === 'image' ? 'jpg' : 'mp4'}`, type, durationInFrames, blobUrl: '', excluded: false }
}

const IMG_90 = makeSlide('a', 'image', 90)
const IMG_90B = makeSlide('b', 'image', 90)
const VID_120 = makeSlide('c', 'video', 120)

const CROSSFADE: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, transitionType: 'crossfade' }
const DIP: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, transitionType: 'dip-to-black' }
const CUT: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, transitionType: 'cut' }

const KB_ON: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, kenBurns: true, fitMode: 'cover' }
const KB_OFF: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, kenBurns: false, fitMode: 'cover' }

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

// --- Transition clamping (short slides) ---

describe('plan — transition clamping for short slides', () => {
  it('clamps dip-to-black (30f) to floor(videoFrames/2) when video is shorter than 2× transition', () => {
    // 16-frame video: min(30, floor(90/2)=45, floor(16/2)=8) = 8
    const short = makeSlide('v', 'video', 16)
    const result = plan([IMG_90, short], DIP)

    const [, e1] = result.entries
    expect(e1.transitionIn?.durationInFrames).toBe(8)
    expect(e1.startFrame).toBe(90 - 8)   // 82
    expect(result.totalFrames).toBe(82 + 16)  // 98, never negative
  })

  it('cursor is never negative regardless of transition/duration ratio', () => {
    const veryShort = makeSlide('v', 'video', 2)
    const result = plan([IMG_90, veryShort], DIP)
    for (const e of result.entries) expect(e.startFrame).toBeGreaterThanOrEqual(0)
    expect(result.totalFrames).toBeGreaterThan(0)
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

// --- Ken Burns ---

describe('plan — Ken Burns vectors', () => {
  const IMG_A = makeSlide('a', 'image', 90)
  const IMG_B = makeSlide('b', 'image', 90)
  const IMG_C = makeSlide('c', 'image', 90)
  const IMG_D = makeSlide('d', 'image', 90)
  const VID = makeSlide('v', 'video', 120)

  it('consecutive photo slides alternate zoom-in / zoom-out deterministically', () => {
    const result = plan([IMG_A, IMG_B, IMG_C, IMG_D], KB_ON)
    const directions = result.entries.map(e =>
      e.kenBurns
        ? (e.kenBurns.toScale > e.kenBurns.fromScale ? 'zoom-in' : 'zoom-out')
        : null,
    )
    expect(directions).toEqual(['zoom-in', 'zoom-out', 'zoom-in', 'zoom-out'])
  })

  it('kenBurns is null for all slides when disabled', () => {
    const result = plan([IMG_A, IMG_B, VID], KB_OFF)
    for (const e of result.entries) expect(e.kenBurns).toBeNull()
  })

  it('kenBurns is null for video slides even when enabled', () => {
    const result = plan([IMG_A, VID, IMG_B], KB_ON)
    expect(result.entries[0].kenBurns).not.toBeNull()
    expect(result.entries[1].kenBurns).toBeNull()  // video
    expect(result.entries[2].kenBurns).not.toBeNull()
  })

  it('Ken Burns alternation is based on photo index not global index (video interspersed)', () => {
    // photo@0=zoom-in, video@1=null, photo@2=zoom-out (photo#1, not global#2)
    const result = plan([IMG_A, VID, IMG_B], KB_ON)
    const d0 = result.entries[0].kenBurns!
    const d2 = result.entries[2].kenBurns!
    const dir0 = d0.toScale > d0.fromScale ? 'zoom-in' : 'zoom-out'
    const dir2 = d2.toScale > d2.fromScale ? 'zoom-in' : 'zoom-out'
    expect(dir0).toBe('zoom-in')
    expect(dir2).toBe('zoom-out')
  })

  it('same slide index always produces same vector (deterministic)', () => {
    const r1 = plan([IMG_A, IMG_B], KB_ON)
    const r2 = plan([IMG_A, IMG_B], KB_ON)
    expect(r1.entries[0].kenBurns).toEqual(r2.entries[0].kenBurns)
    expect(r1.entries[1].kenBurns).toEqual(r2.entries[1].kenBurns)
  })

  it('all 4 photo presets have distinct pan vectors (no duplicate motion arcs)', () => {
    const slides = [IMG_A, IMG_B, IMG_C, IMG_D]
    const result = plan(slides, KB_ON)
    const panKeys = result.entries.map(e => {
      const kb = e.kenBurns!
      return `${kb.fromX},${kb.fromY}->${kb.toX},${kb.toY}`
    })
    const unique = new Set(panKeys)
    expect(unique.size).toBe(4)
  })
})

// --- Fit modes ---

describe('plan — fit mode resolution', () => {
  const IMG = makeSlide('i', 'image', 90)
  const VID = makeSlide('v', 'video', 120)

  it('videos always get fitMode=contain regardless of global setting', () => {
    const settings: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, fitMode: 'cover' }
    const result = plan([IMG, VID], settings)
    expect(result.entries[0].fitMode).toBe('cover')
    expect(result.entries[1].fitMode).toBe('contain')
  })

  it('images inherit global fitMode', () => {
    const cover: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, fitMode: 'cover' }
    const contain: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, fitMode: 'contain' }
    const blur: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, fitMode: 'blur-fill' }

    expect(plan([IMG], cover).entries[0].fitMode).toBe('cover')
    expect(plan([IMG], contain).entries[0].fitMode).toBe('contain')
    expect(plan([IMG], blur).entries[0].fitMode).toBe('blur-fill')
  })
})

// --- Per-slide overrides ---

describe('plan — per-slide overrides', () => {
  const BASE: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, fitMode: 'cover', kenBurns: true, transitionType: 'crossfade' }

  it('slide fitMode override wins over global', () => {
    const img = makeSlide('i', 'image', 90)
    const overridden = { ...img, overrides: { fitMode: 'contain' as const } }
    const result = plan([overridden], BASE)
    expect(result.entries[0].fitMode).toBe('contain')
  })

  it('slide kenBurns=false override disables Ken Burns for that slide only', () => {
    const img1 = makeSlide('a', 'image', 90)
    const img2 = { ...makeSlide('b', 'image', 90), overrides: { kenBurns: false } }
    const result = plan([img1, img2], BASE)
    expect(result.entries[0].kenBurns).not.toBeNull()
    expect(result.entries[1].kenBurns).toBeNull()
  })

  it('slide transitionType override changes only that slide\'s transitionIn', () => {
    const img1 = makeSlide('a', 'image', 90)
    const img2 = { ...makeSlide('b', 'image', 90), overrides: { transitionType: 'cut' as const } }
    const result = plan([img1, img2], BASE)
    expect(result.entries[0].transitionIn).toBeUndefined()
    expect(result.entries[1].transitionIn?.type).toBe('cut')
    expect(result.entries[1].transitionIn?.durationInFrames).toBe(0)
  })

  it('slide imageDurationSecs override changes duration for image slides', () => {
    const img = { ...makeSlide('a', 'image', 90), overrides: { imageDurationSecs: 5 } }
    const result = plan([img], BASE)
    // 5 seconds × 30 fps = 150 frames
    expect(result.entries[0].durationInFrames).toBe(150)
    expect(result.totalFrames).toBe(150)
  })

  it('imageDurationSecs override does not affect video slides', () => {
    const vid = { ...makeSlide('v', 'video', 120), overrides: { imageDurationSecs: 5 } }
    const result = plan([vid], BASE)
    expect(result.entries[0].durationInFrames).toBe(120) // unchanged
  })

  it('undefined override field falls back to global', () => {
    const img = { ...makeSlide('a', 'image', 90), overrides: { fitMode: undefined } }
    const result = plan([img], BASE)
    expect(result.entries[0].fitMode).toBe('cover') // global default
  })
})

// --- Title slides in planner ---

describe('plan — title slides', () => {
  const SETTINGS = { ...DEFAULT_GLOBAL_SETTINGS, transitionType: 'crossfade' as const, kenBurns: true }

  it('title slide appears in entries with its durationInFrames', () => {
    const t = createTitleSlide('t', 'Opening')
    const result = plan([t], SETTINGS)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].durationInFrames).toBe(90)
    expect(result.totalFrames).toBe(90)
  })

  it('title slide has kenBurns=null regardless of global setting', () => {
    const t = createTitleSlide('t', 'Title')
    const result = plan([t], SETTINGS)
    expect(result.entries[0].kenBurns).toBeNull()
  })

  it('title slide does not advance photo index so Ken Burns alternation is unaffected', () => {
    const img1 = makeSlide('a', 'image', 90)
    const title = createTitleSlide('t', 'Mid')
    const img2 = makeSlide('b', 'image', 90)
    const result = plan([img1, title, img2], SETTINGS)
    const d0 = result.entries[0].kenBurns!
    const d2 = result.entries[2].kenBurns!
    const dir0 = d0.toScale > d0.fromScale ? 'zoom-in' : 'zoom-out'
    const dir2 = d2.toScale > d2.fromScale ? 'zoom-in' : 'zoom-out'
    // photo index 0 → zoom-in, photo index 1 → zoom-out
    expect(dir0).toBe('zoom-in')
    expect(dir2).toBe('zoom-out')
  })

  it('title slide participates in transitions with adjacent slides', () => {
    const img = makeSlide('a', 'image', 90)
    const t = createTitleSlide('t', 'Title')
    const result = plan([img, t], SETTINGS)
    expect(result.entries[1].transitionIn?.type).toBe('crossfade')
    expect(result.entries[1].transitionIn?.durationInFrames).toBe(15)
  })

  it('title slide transition override is respected', () => {
    const img = makeSlide('a', 'image', 90)
    const t = { ...createTitleSlide('t', 'Title'), overrides: { transitionType: 'cut' as const } }
    const result = plan([img, t], SETTINGS)
    expect(result.entries[1].transitionIn?.type).toBe('cut')
    expect(result.entries[1].transitionIn?.durationInFrames).toBe(0)
  })

  it('mixed sequence totalFrames is consistent', () => {
    const img = makeSlide('a', 'image', 90)
    const t = { ...createTitleSlide('t', 'Title'), durationInFrames: 60 }
    const result = plan([img, t], SETTINGS)
    // 90 + 60 - 15 (crossfade overlap) = 135
    expect(result.totalFrames).toBe(135)
  })
})
