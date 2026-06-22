import { describe, expect, it } from 'vitest'
import { plan, TRANSITION_FRAMES } from './planner'
import type { GlobalSettings } from '../timeline-core/settings'
import { DEFAULT_GLOBAL_SETTINGS } from '../timeline-core/settings'
import type { BeatGrid } from '../beat-grid/types'
import type { MediaSlide } from '../timeline-core/types'
import { createTitleSlide } from '../timeline-core/timeline'

function makeSlide(id: string, type: 'image' | 'video', durationInFrames: number): MediaSlide {
  const slide: MediaSlide = {
    blobUrl: '',
    durationInFrames,
    excluded: false,
    filename: `${id}.${type === 'image' ? 'jpg' : 'mp4'}`,
    id,
    type,
  }
  if (type === 'image') {
    return { ...slide, overrides: { imageDurationSecs: durationInFrames / 30 } }
  }
  return slide
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

describe('plan — audio clips', () => {
  const CLIP_A = { blobUrl: 'blob:audio-a', durationInFrames: 120 }
  const CLIP_B = { blobUrl: 'blob:audio-b', durationInFrames: 90 }
  const DUCKING = {
    keyframes: [{ frame: 0, volume: 1 }],
    rampFrames: 6,
    segments: [],
  }

  it('includes sequential audio segments on RenderPlan when provided', () => {
    const result = plan([IMG_90], CROSSFADE, undefined, [CLIP_A])
    expect(result.audioSegments).toEqual([
      {
        blobUrl: CLIP_A.blobUrl,
        durationInFrames: CLIP_A.durationInFrames,
        gainDb: 0,
        startFrame: 0,
      },
    ])
    expect(result.duckingEnvelope).toEqual(DUCKING)
    expect(result.totalFrames).toBe(120)
  })

  it('omits audio segments when not provided', () => {
    const result = plan([IMG_90], CROSSFADE)
    expect(result.audioSegments).toBeUndefined()
    expect(result.duckingEnvelope).toBeUndefined()
  })

  it('places clip 2 immediately after clip 1 with no gap', () => {
    const result = plan([IMG_90], CROSSFADE, undefined, [CLIP_A, CLIP_B])
    expect(result.audioSegments).toEqual([
      {
        blobUrl: CLIP_A.blobUrl,
        durationInFrames: 120,
        gainDb: 0,
        startFrame: 0,
      },
      {
        blobUrl: CLIP_B.blobUrl,
        durationInFrames: 90,
        gainDb: 0,
        startFrame: 120,
      },
    ])
  })

  it('uses visual duration when audio is shorter than slides', () => {
    const shortClip = { blobUrl: 'blob:short', durationInFrames: 60 }
    const result = plan([IMG_90, IMG_90B], CROSSFADE, undefined, [shortClip])
    expect(result.totalFrames).toBe(165)
    expect(result.audioSegments?.[0].durationInFrames).toBe(60)
    expect(result.entries.length).toBe(2)
  })

  it('extends totalFrames to audio duration and loops the slide sequence', () => {
    const longClip = { blobUrl: 'blob:long', durationInFrames: 400 }
    const result = plan([IMG_90, IMG_90B], CROSSFADE, undefined, [longClip])
    expect(result.totalFrames).toBe(400)
    expect(result.entries.length).toBeGreaterThan(2)
    expect(result.entries[2].startFrame).toBe(165)
    const lastEntry = result.entries.at(-1)
    expect(lastEntry).toBeDefined()
    expect(lastEntry!.startFrame + lastEntry!.durationInFrames).toBe(400)
  })
})

describe('plan — audio-driven loop golden snapshot', () => {
  const CUT_SETTINGS: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, transitionType: 'cut' }
  const LONG_AUDIO = [{ blobUrl: 'blob:long', durationInFrames: 250 }]

  it('matches golden snapshot for looped entries with a partial tail', () => {
    const result = plan([IMG_90, IMG_90B], CUT_SETTINGS, undefined, LONG_AUDIO)

    expect(result.totalFrames).toBe(250)
    expect(result.entries).toEqual([
      {
        slide: IMG_90,
        startFrame: 0,
        durationInFrames: 90,
        transitionIn: undefined,
        fitMode: 'cover',
        kenBurns: result.entries[0].kenBurns,
        videoVolume: 1,
      },
      {
        slide: IMG_90B,
        startFrame: 90,
        durationInFrames: 90,
        transitionIn: { type: 'cut', durationInFrames: 0 },
        fitMode: 'cover',
        kenBurns: result.entries[1].kenBurns,
        videoVolume: 1,
      },
      {
        slide: IMG_90,
        startFrame: 180,
        durationInFrames: 70,
        transitionIn: undefined,
        fitMode: 'cover',
        kenBurns: result.entries[2].kenBurns,
        videoVolume: 1,
      },
    ])
  })
})

// --- kenBurnsMode: zoom-in-only ---

describe('plan — kenBurnsMode zoom-in-only', () => {
  const ZOOM_IN_SETTINGS: GlobalSettings = {
    ...DEFAULT_GLOBAL_SETTINGS,
    kenBurns: true,
    kenBurnsMode: 'zoom-in-only',
    transitionType: 'cut',
  }

  it('all Ken Burns vectors are zoom-in (toScale > fromScale) for multiple image slides', () => {
    const slides = [
      makeSlide('a', 'image', 90),
      makeSlide('b', 'image', 90),
      makeSlide('c', 'image', 90),
      makeSlide('d', 'image', 90),
    ]
    const result = plan(slides, ZOOM_IN_SETTINGS)
    for (const entry of result.entries) {
      expect(entry.kenBurns).not.toBeNull()
      expect(entry.kenBurns!.toScale).toBeGreaterThan(entry.kenBurns!.fromScale)
    }
  })

  it('alternate mode produces both zoom-in and zoom-out across 4+ slides', () => {
    const slides = [
      makeSlide('a', 'image', 90),
      makeSlide('b', 'image', 90),
      makeSlide('c', 'image', 90),
      makeSlide('d', 'image', 90),
    ]
    const result = plan(slides, KB_ON)
    const directions = result.entries.map(e =>
      e.kenBurns!.toScale > e.kenBurns!.fromScale ? 'in' : 'out',
    )
    expect(directions).toContain('in')
    expect(directions).toContain('out')
  })
})

// --- Beat sync ---
// 120 BPM @ 30fps → beatFrames = 15
const BEAT_GRID_120: BeatGrid = { bpm: 120, beatIntervalSecs: 0.5, firstBeatOffsetSecs: 0 }
const BEAT_F = 15

const BEAT_SYNC_ON: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, transitionType: 'cut', beatSync: true, energy: 'medium' }
const BEAT_SYNC_OFF: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, transitionType: 'cut', beatSync: false }

describe('plan — beat sync off (AC3)', () => {
  it('uses exact target durations when beatSync is false', () => {
    const slides = [makeSlide('a', 'image', 92), makeSlide('b', 'image', 77)]
    const result = plan(slides, BEAT_SYNC_OFF, undefined, undefined, BEAT_GRID_120)
    expect(result.entries[0].durationInFrames).toBe(92)
    expect(result.entries[1].durationInFrames).toBe(77)
  })

  it('uses exact target durations when no beatGrid provided', () => {
    const slides = [makeSlide('a', 'image', 92), makeSlide('b', 'image', 77)]
    const result = plan(slides, BEAT_SYNC_ON, undefined, undefined, undefined)
    expect(result.entries[0].durationInFrames).toBe(92)
    expect(result.entries[1].durationInFrames).toBe(77)
  })
})

describe('plan — beat sync on (AC2)', () => {
  it('every slide duration is a multiple of beat frames (lands on a beat)', () => {
    const slides = [
      makeSlide('a', 'image', 92),
      makeSlide('b', 'image', 77),
      makeSlide('c', 'image', 105),
    ]
    const result = plan(slides, BEAT_SYNC_ON, undefined, undefined, BEAT_GRID_120)
    for (const entry of result.entries) {
      expect(entry.durationInFrames % BEAT_F).toBe(0)
    }
  })

  it('each duration deviates from target by at most half a beat interval', () => {
    const targets = [88, 92, 99, 105, 110]
    const slides = targets.map((d, i) => makeSlide(`s${i}`, 'image', d))
    const result = plan(slides, BEAT_SYNC_ON, undefined, undefined, BEAT_GRID_120)
    result.entries.forEach((entry, i) => {
      expect(Math.abs(entry.durationInFrames - targets[i])).toBeLessThanOrEqual(BEAT_F / 2)
    })
  })
})

describe('plan — beat sync energy effect (AC4)', () => {
  it('calm produces longer average duration than punchy on same timeline', () => {
    const targets = [60, 75, 90, 105, 120]
    const slides = targets.map((d, i) => makeSlide(`s${i}`, 'image', d))

    const calmSettings: GlobalSettings = { ...BEAT_SYNC_ON, energy: 'calm' }
    const punchySettings: GlobalSettings = { ...BEAT_SYNC_ON, energy: 'punchy' }

    const calmResult = plan(slides, calmSettings, undefined, undefined, BEAT_GRID_120)
    const punchyResult = plan(slides, punchySettings, undefined, undefined, BEAT_GRID_120)

    const avg = (entries: typeof calmResult.entries) =>
      entries.reduce((s, e) => s + e.durationInFrames, 0) / entries.length

    expect(avg(calmResult.entries)).toBeGreaterThan(avg(punchyResult.entries))
  })
})

describe('plan — concatenated beat times (multi-clip)', () => {
  const AUDIO_CLIPS = [
    { blobUrl: 'blob:a', durationInFrames: 60 },
    { blobUrl: 'blob:b', durationInFrames: 60 },
  ]

  it('snaps slide end to beats on the concatenated timeline using start position', () => {
    const concatenatedBeatTimes = [0, 1, 2.1, 3.1]
    const slides = [makeSlide('a', 'image', 50)]
    const result = plan(
      slides,
      BEAT_SYNC_ON,
      undefined,
      AUDIO_CLIPS,
      undefined,
      concatenatedBeatTimes,
    )
    expect(result.entries[0].durationInFrames).toBe(63)
    expect(result.totalFrames).toBe(120)
  })

  it('position-aware snap differs from uniform grid when slide starts in clip 2', () => {
    const concatenatedBeatTimes = [0, 1, 2.1, 3.1]
    const slides = [
      makeSlide('a', 'image', 30),
      makeSlide('b', 'image', 50),
    ]
    const withConcat = plan(
      slides,
      BEAT_SYNC_ON,
      undefined,
      AUDIO_CLIPS,
      undefined,
      concatenatedBeatTimes,
    )
    expect(withConcat.entries[0].durationInFrames).toBe(30)
    const secondEntry = withConcat.entries[1]
    expect(secondEntry.startFrame).toBe(30)
    expect(secondEntry.durationInFrames).toBe(63)
  })

  it('terminates when beat-snapped durations are shorter than crossfade overlap', () => {
    const concatenatedBeatTimes = Array.from({ length: 1200 }, (_, index) => index * 0.5)
    const slides = Array.from({ length: 20 }, (_, index) => makeSlide(`slide-${index}`, 'image', 90))
    const classic = { ...BEAT_SYNC_ON, transitionType: 'crossfade' as const }
    const result = plan(
      slides,
      classic,
      undefined,
      [{ blobUrl: 'blob:audio', durationInFrames: 18000 }],
      undefined,
      concatenatedBeatTimes,
    )
    expect(result.entries.length).toBeLessThan(5000)
    expect(result.totalFrames).toBe(18000)
  })
})
