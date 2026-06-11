import { describe, expect, it } from 'vitest'
import { isTitleSlide } from '../timeline-core/types'
import { DEFAULT_GLOBAL_SETTINGS } from '../timeline-core/settings'
import type { MediaSlide } from '../timeline-core/types'
import { DUCK_LEVEL, DUCK_RAMP_FRAMES, plan } from './planner'

function makeSlide(
  id: string,
  type: 'image' | 'video',
  durationInFrames: number,
  overrides?: MediaSlide['overrides'],
): MediaSlide {
  return {
    blobUrl: '',
    durationInFrames,
    excluded: false,
    filename: `${id}.${type === 'image' ? 'jpg' : 'mp4'}`,
    id,
    overrides,
    type,
  }
}

const SETTINGS = { ...DEFAULT_GLOBAL_SETTINGS, transitionType: 'cut' as const }
const SOUNDTRACK = { blobUrl: 'blob:audio', durationInFrames: 900 }

describe('plan — soundtrack ducking envelope', () => {
  it('ducks music during a video slide between photos', () => {
    const photo = makeSlide('a', 'image', 90)
    const video = makeSlide('v', 'video', 120)
    const photo2 = makeSlide('b', 'image', 90)

    const result = plan([photo, video, photo2], SETTINGS, undefined, SOUNDTRACK)
    const envelope = result.soundtrack?.duckingEnvelope

    expect(envelope).toBeDefined()
    expect(envelope!.rampFrames).toBe(DUCK_RAMP_FRAMES)
    expect(envelope!.segments).toEqual([
      {
        duckEndFrame: 90 + 120 - DUCK_RAMP_FRAMES - 1,
        duckLevel: DUCK_LEVEL,
        duckStartFrame: 90 + DUCK_RAMP_FRAMES,
      },
    ])

    const holdKeyframes = envelope!.keyframes.filter((keyframe) => keyframe.volume === DUCK_LEVEL)
    expect(holdKeyframes.length).toBeGreaterThan(0)
    expect(envelope!.keyframes[0]).toEqual({ frame: 0, volume: 1 })
  })

  it('does not duck when video audio is muted', () => {
    const video = makeSlide('v', 'video', 120, { muteVideoAudio: true })

    const result = plan([video], SETTINGS, undefined, SOUNDTRACK)

    expect(result.soundtrack?.duckingEnvelope.segments).toEqual([])
    expect(result.entries[0].videoVolume).toBe(0)
  })

  it('mutes soundtrack when muteMusic is set', () => {
    const video = makeSlide('v', 'video', 120, { muteMusic: true })

    const result = plan([video], SETTINGS, undefined, SOUNDTRACK)
    const { keyframes } = result.soundtrack!.duckingEnvelope

    expect(result.soundtrack?.duckingEnvelope.segments).toEqual([])
    expect(keyframes).toContainEqual({ frame: 0, volume: 0 })
    expect(keyframes).toContainEqual({ frame: 120, volume: 1 })
  })

  it('uses custom musicVolume instead of default duck level', () => {
    const video = makeSlide('v', 'video', 120, { musicVolume: 0.5 })

    const result = plan([video], SETTINGS, undefined, SOUNDTRACK)

    expect(result.soundtrack?.duckingEnvelope.segments).toEqual([])
    expect(result.soundtrack?.duckingEnvelope.keyframes).toContainEqual({ frame: 0, volume: 0.5 })
    expect(result.soundtrack?.duckingEnvelope.keyframes).toContainEqual({ frame: 120, volume: 1 })
  })
})

describe('plan — ducking envelope property', () => {
  it('duck segments exactly cover unmuted video-audio spans', () => {
    const cases: MediaSlide[][] = [
      [makeSlide('a', 'image', 60), makeSlide('v', 'video', 90), makeSlide('b', 'image', 45)],
      [
        makeSlide('v1', 'video', 30),
        makeSlide('v2', 'video', 40, { muteVideoAudio: true }),
        makeSlide('v3', 'video', 50, { muteMusic: true }),
        makeSlide('v4', 'video', 70),
      ],
      [makeSlide('v', 'video', 8)],
    ]

    for (const slides of cases) {
      const result = plan(slides, SETTINGS, undefined, SOUNDTRACK)
      const envelope = result.soundtrack!.duckingEnvelope
      const expectedSpans = result.entries.flatMap((entry) => {
        const { durationInFrames, slide, startFrame } = entry
        if (isTitleSlide(slide) || slide.type !== 'video') return []
        if (slide.overrides?.muteVideoAudio || slide.overrides?.muteMusic) return []
        if (slide.overrides?.musicVolume !== undefined) return []
        return [{
          endFrame: startFrame + durationInFrames - 1,
          startFrame,
        }]
      })

      const actualSpans = envelope.segments.map((segment) => ({
        endFrame: segment.duckEndFrame,
        startFrame: segment.duckStartFrame,
      }))

      expect(actualSpans).toEqual(expectedSpans.map((span) => {
        const duckStartFrame = span.startFrame + DUCK_RAMP_FRAMES
        const duckEndFrame = span.endFrame - DUCK_RAMP_FRAMES
        if (duckEndFrame < duckStartFrame) {
          return { endFrame: span.endFrame, startFrame: span.startFrame }
        }
        return { endFrame: duckEndFrame, startFrame: duckStartFrame }
      }))
    }
  })
})
