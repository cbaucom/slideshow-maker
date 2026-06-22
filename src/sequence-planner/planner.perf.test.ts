import { describe, expect, it } from 'vitest'
import { applyTheme } from '../timeline-core/settings'
import type { MediaSlide } from '../timeline-core/types'
import { plan } from './planner'

function makeSlide(index: number): MediaSlide {
  return {
    blobUrl: `blob:${index}`,
    durationInFrames: 90,
    excluded: false,
    filename: `photo-${index}.jpg`,
    id: `slide-${index}`,
    type: 'image',
  }
}

const LONG_AUDIO = [{ blobUrl: 'blob:audio', durationInFrames: 18000, gainDb: 0 }]
const CONCATENATED_BEATS = Array.from({ length: 1200 }, (_, index) => index * 0.5)

describe('plan — performance guard', () => {
  it('plans a long looped timeline within 500ms', () => {
    const slides = Array.from({ length: 80 }, (_, index) => makeSlide(index))
    const classic = applyTheme('classic')
    const energetic = applyTheme('energetic')

    const classicStart = performance.now()
    const classicPlan = plan(slides, classic, undefined, LONG_AUDIO, undefined, CONCATENATED_BEATS)
    const classicMs = performance.now() - classicStart

    const energeticStart = performance.now()
    const energeticPlan = plan(slides, energetic, undefined, LONG_AUDIO, undefined, CONCATENATED_BEATS)
    const energeticMs = performance.now() - energeticStart

    expect(classicPlan.entries.length).toBeGreaterThan(100)
    expect(energeticPlan.entries.length).toBeGreaterThan(classicPlan.entries.length)
    expect(classicMs).toBeLessThan(500)
    expect(energeticMs).toBeLessThan(500)
  })
})
