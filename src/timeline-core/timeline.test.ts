import { describe, it, expect } from 'vitest'
import { moveSlide, toggleExcluded, filterIncluded } from './timeline'
import type { MediaSlide } from './types'

function slide(id: string, excluded = false): MediaSlide {
  return { id, filename: `${id}.jpg`, type: 'image', blobUrl: '', durationInFrames: 90, excluded }
}

describe('moveSlide', () => {
  it('moves a slide forward in the list', () => {
    const slides = [slide('a'), slide('b'), slide('c')]
    const result = moveSlide(slides, 0, 2)
    expect(result.map(s => s.id)).toEqual(['b', 'c', 'a'])
  })

  it('moves a slide backward in the list', () => {
    const slides = [slide('a'), slide('b'), slide('c')]
    const result = moveSlide(slides, 2, 0)
    expect(result.map(s => s.id)).toEqual(['c', 'a', 'b'])
  })

  it('moving to same index is a no-op', () => {
    const slides = [slide('a'), slide('b'), slide('c')]
    const result = moveSlide(slides, 1, 1)
    expect(result.map(s => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate the original array', () => {
    const slides = [slide('a'), slide('b'), slide('c')]
    moveSlide(slides, 0, 2)
    expect(slides.map(s => s.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('toggleExcluded', () => {
  it('excludes an included slide', () => {
    const slides = [slide('a'), slide('b')]
    const result = toggleExcluded(slides, 'a')
    expect(result.find(s => s.id === 'a')!.excluded).toBe(true)
    expect(result.find(s => s.id === 'b')!.excluded).toBe(false)
  })

  it('re-includes an excluded slide', () => {
    const slides = [slide('a', true), slide('b')]
    const result = toggleExcluded(slides, 'a')
    expect(result.find(s => s.id === 'a')!.excluded).toBe(false)
  })

  it('preserves the slide position when toggling', () => {
    const slides = [slide('a'), slide('b'), slide('c')]
    const result = toggleExcluded(slides, 'b')
    expect(result.map(s => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate the original array', () => {
    const slides = [slide('a')]
    toggleExcluded(slides, 'a')
    expect(slides[0].excluded).toBe(false)
  })
})

describe('filterIncluded', () => {
  it('returns only non-excluded slides', () => {
    const slides = [slide('a', false), slide('b', true), slide('c', false)]
    const result = filterIncluded(slides)
    expect(result.map(s => s.id)).toEqual(['a', 'c'])
  })

  it('returns all slides when none are excluded', () => {
    const slides = [slide('a'), slide('b')]
    expect(filterIncluded(slides)).toHaveLength(2)
  })

  it('returns empty array when all are excluded', () => {
    const slides = [slide('a', true), slide('b', true)]
    expect(filterIncluded(slides)).toHaveLength(0)
  })
})
