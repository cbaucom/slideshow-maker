import { describe, expect, it } from 'vitest'
import { resolveSmartFit } from './smartFit'

const LANDSCAPE_16_9 = { height: 1080, width: 1920 }
const PORTRAIT_9_16 = { height: 1920, width: 1080 }
const SQUARE = { height: 1080, width: 1080 }

describe('resolveSmartFit', () => {
  it('uses cover when media and canvas share landscape orientation', () => {
    expect(resolveSmartFit(
      LANDSCAPE_16_9.width,
      LANDSCAPE_16_9.height,
      LANDSCAPE_16_9.width,
      LANDSCAPE_16_9.height,
    )).toBe('cover')
  })

  it('uses cover when media and canvas share portrait orientation', () => {
    expect(resolveSmartFit(
      PORTRAIT_9_16.width,
      PORTRAIT_9_16.height,
      PORTRAIT_9_16.width,
      PORTRAIT_9_16.height,
    )).toBe('cover')
  })

  it('uses blur-fill for landscape media in a portrait canvas', () => {
    expect(resolveSmartFit(
      LANDSCAPE_16_9.width,
      LANDSCAPE_16_9.height,
      PORTRAIT_9_16.width,
      PORTRAIT_9_16.height,
    )).toBe('blur-fill')
  })

  it('uses blur-fill for portrait media in a landscape canvas', () => {
    expect(resolveSmartFit(
      PORTRAIT_9_16.width,
      PORTRAIT_9_16.height,
      LANDSCAPE_16_9.width,
      LANDSCAPE_16_9.height,
    )).toBe('blur-fill')
  })

  it('uses blur-fill for square media in a landscape canvas', () => {
    expect(resolveSmartFit(
      SQUARE.width,
      SQUARE.height,
      LANDSCAPE_16_9.width,
      LANDSCAPE_16_9.height,
    )).toBe('blur-fill')
  })

  it('uses blur-fill for landscape media in a square canvas', () => {
    expect(resolveSmartFit(
      LANDSCAPE_16_9.width,
      LANDSCAPE_16_9.height,
      SQUARE.width,
      SQUARE.height,
    )).toBe('blur-fill')
  })

  it('uses cover for square media in a square canvas', () => {
    expect(resolveSmartFit(
      SQUARE.width,
      SQUARE.height,
      SQUARE.width,
      SQUARE.height,
    )).toBe('cover')
  })

  it('falls back to contain when dimensions are missing or zero', () => {
    expect(resolveSmartFit(0, 1080, 1920, 1080)).toBe('contain')
    expect(resolveSmartFit(1920, 0, 1920, 1080)).toBe('contain')
  })
})
