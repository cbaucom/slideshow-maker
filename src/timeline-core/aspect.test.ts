import { describe, it, expect } from 'vitest'
import { DEFAULT_ASPECT_RATIO, dimensionsForAspectRatio } from './aspect'

describe('dimensionsForAspectRatio', () => {
  it('16:9 is a 1920×1080 landscape canvas', () => {
    expect(dimensionsForAspectRatio('16:9')).toEqual({ width: 1920, height: 1080 })
  })

  it('9:16 is a 1080×1920 portrait canvas', () => {
    expect(dimensionsForAspectRatio('9:16')).toEqual({ width: 1080, height: 1920 })
  })

  it('1:1 is a 1080×1080 square canvas', () => {
    expect(dimensionsForAspectRatio('1:1')).toEqual({ width: 1080, height: 1080 })
  })
})

describe('DEFAULT_ASPECT_RATIO', () => {
  it('defaults to a 16:9 1080p canvas', () => {
    expect(DEFAULT_ASPECT_RATIO).toBe('16:9')
    expect(dimensionsForAspectRatio(DEFAULT_ASPECT_RATIO)).toEqual({ width: 1920, height: 1080 })
  })
})
