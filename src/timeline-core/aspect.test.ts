import { describe, it, expect } from 'vitest'
import { DEFAULT_ASPECT_RATIO, dimensionsForAspectRatio, isAspectRatio } from './aspect'

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

describe('isAspectRatio', () => {
  it('accepts every supported ratio', () => {
    expect(isAspectRatio('16:9')).toBe(true)
    expect(isAspectRatio('9:16')).toBe(true)
    expect(isAspectRatio('1:1')).toBe(true)
  })

  it('rejects unsupported values from untrusted slideshow.json', () => {
    expect(isAspectRatio('4:3')).toBe(false)
    expect(isAspectRatio(123)).toBe(false)
    expect(isAspectRatio(undefined)).toBe(false)
    expect(isAspectRatio(null)).toBe(false)
  })
})

describe('DEFAULT_ASPECT_RATIO', () => {
  it('defaults to a 16:9 1080p canvas', () => {
    expect(DEFAULT_ASPECT_RATIO).toBe('16:9')
    expect(dimensionsForAspectRatio(DEFAULT_ASPECT_RATIO)).toEqual({ width: 1920, height: 1080 })
  })
})
