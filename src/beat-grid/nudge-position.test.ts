import { describe, expect, it } from 'vitest'
import { nudgeSlideEndFrame } from './nudge-position'

const BEAT_TIMES = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]
const FPS = 30

describe('nudgeSlideEndFrame', () => {
  it('snaps a slide end to the nearest concatenated beat', () => {
    const duration = nudgeSlideEndFrame(45, 40, BEAT_TIMES, 'medium', FPS)
    expect(45 + duration).toBe(90)
  })

  it('uses beats after the slide start when snapping', () => {
    const duration = nudgeSlideEndFrame(60, 40, BEAT_TIMES, 'medium', FPS)
    expect(60 + duration).toBe(105)
  })
})
