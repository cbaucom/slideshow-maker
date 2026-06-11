import { describe, expect, it } from 'vitest'
import { plan } from './planner'
import { slideIdAtFrame, startFrameForSlideId } from './playback'
import type { GlobalSettings } from '../timeline-core/settings'
import { DEFAULT_GLOBAL_SETTINGS } from '../timeline-core/settings'
import type { MediaSlide } from '../timeline-core/types'

function makeSlide(id: string, type: 'image' | 'video', durationInFrames: number): MediaSlide {
  return {
    blobUrl: '',
    durationInFrames,
    excluded: false,
    filename: `${id}.jpg`,
    id,
    type,
  }
}

const CROSSFADE: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, transitionType: 'crossfade' }
const IMG_A = makeSlide('slide-a', 'image', 90)
const IMG_B = makeSlide('slide-b', 'image', 90)
const IMG_C = makeSlide('slide-c', 'image', 120)

describe('startFrameForSlideId', () => {
  it('returns the planned start frame for an included slide', () => {
    const renderPlan = plan([IMG_A, IMG_B, IMG_C], CROSSFADE)
    expect(startFrameForSlideId(renderPlan, 'slide-b')).toBe(75)
  })

  it('returns null when the slide is not in the plan', () => {
    const renderPlan = plan([IMG_A], CROSSFADE)
    expect(startFrameForSlideId(renderPlan, 'missing')).toBeNull()
  })
})

describe('slideIdAtFrame', () => {
  it('returns null for an empty plan', () => {
    const renderPlan = plan([], CROSSFADE)
    expect(slideIdAtFrame(renderPlan, 0)).toBeNull()
  })

  it('highlights the slide whose start frame has been reached', () => {
    const renderPlan = plan([IMG_A, IMG_B, IMG_C], CROSSFADE)

    expect(slideIdAtFrame(renderPlan, 0)).toBe('slide-a')
    expect(slideIdAtFrame(renderPlan, 74)).toBe('slide-a')
    expect(slideIdAtFrame(renderPlan, 75)).toBe('slide-b')
    expect(slideIdAtFrame(renderPlan, 149)).toBe('slide-b')
    expect(slideIdAtFrame(renderPlan, 150)).toBe('slide-c')
  })
})
