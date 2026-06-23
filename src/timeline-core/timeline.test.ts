import { describe, it, expect } from 'vitest'
import {
  createTitleSlide,
  filterIncluded,
  moveSlide,
  moveSlideBlock,
  moveSlidesToBeginning,
  moveSlidesToEnd,
  toggleExcluded,
} from './timeline'
import type { MediaSlide, Slide } from './types'

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

describe('moveSlidesToBeginning', () => {
  it('moves one slide to the front', () => {
    const slides = [slide('a'), slide('b'), slide('c')]
    expect(moveSlidesToBeginning(slides, [2]).map((entry) => entry.id)).toEqual(['c', 'a', 'b'])
  })

  it('preserves relative order among multiple selected slides', () => {
    const slides = [slide('a'), slide('b'), slide('c'), slide('d'), slide('e')]
    expect(moveSlidesToBeginning(slides, [1, 3]).map((entry) => entry.id)).toEqual(['b', 'd', 'a', 'c', 'e'])
  })
})

describe('moveSlidesToEnd', () => {
  it('moves one slide to the back', () => {
    const slides = [slide('a'), slide('b'), slide('c')]
    expect(moveSlidesToEnd(slides, [0]).map((entry) => entry.id)).toEqual(['b', 'c', 'a'])
  })

  it('preserves relative order among multiple selected slides', () => {
    const slides = [slide('a'), slide('b'), slide('c'), slide('d'), slide('e')]
    expect(moveSlidesToEnd(slides, [1, 3]).map((entry) => entry.id)).toEqual(['a', 'c', 'e', 'b', 'd'])
  })
})

describe('moveSlideBlock', () => {
  it('delegates to moveSlide for a single index', () => {
    const slides = [slide('a'), slide('b'), slide('c')]
    expect(moveSlideBlock(slides, [0], 2).map((entry) => entry.id)).toEqual(['b', 'c', 'a'])
  })

  it('moves a non-contiguous block forward', () => {
    const slides = [slide('a'), slide('b'), slide('c'), slide('d'), slide('e')]
    expect(moveSlideBlock(slides, [1, 3], 4).map((entry) => entry.id)).toEqual(['a', 'c', 'e', 'b', 'd'])
  })

  it('moves a non-contiguous block backward', () => {
    const slides = [slide('a'), slide('b'), slide('c'), slide('d'), slide('e')]
    expect(moveSlideBlock(slides, [1, 3], 0).map((entry) => entry.id)).toEqual(['b', 'd', 'a', 'c', 'e'])
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

// --- createTitleSlide ---

describe('createTitleSlide', () => {
  it('returns a TitleSlide with kind=title and the given heading', () => {
    const s = createTitleSlide('id-1', 'My Trip')
    expect(s.kind).toBe('title')
    expect(s.heading).toBe('My Trip')
  })

  it('defaults to dark style, 3-second duration, not excluded', () => {
    const s = createTitleSlide('id-2')
    expect(s.style).toBe('dark')
    expect(s.durationInFrames).toBe(90)
    expect(s.excluded).toBe(false)
  })

  it('sets subtext to undefined when not provided', () => {
    const s = createTitleSlide('id-3')
    expect(s.subtext).toBeUndefined()
  })
})

// --- mixed Slide[] operations ---

describe('timeline operations with mixed Slide[]', () => {
  function mediaSlide(id: string): MediaSlide {
    return { id, filename: `${id}.jpg`, type: 'image', blobUrl: '', durationInFrames: 90, excluded: false }
  }

  it('moveSlide works with mixed media and title slides', () => {
    const slides: Slide[] = [mediaSlide('m'), createTitleSlide('t', 'Title'), mediaSlide('n')]
    const result = moveSlide(slides, 0, 2)
    expect(result.map(s => s.id)).toEqual(['t', 'n', 'm'])
  })

  it('toggleExcluded works on a title slide', () => {
    const slides: Slide[] = [mediaSlide('m'), createTitleSlide('t', 'Title')]
    const result = toggleExcluded(slides, 't')
    expect(result.find(s => s.id === 't')!.excluded).toBe(true)
    expect(result.find(s => s.id === 'm')!.excluded).toBe(false)
  })

  it('filterIncluded excludes title slides marked excluded', () => {
    const t = { ...createTitleSlide('t', 'Title'), excluded: true }
    const m = mediaSlide('m')
    const slides: Slide[] = [t, m]
    const result = filterIncluded(slides)
    expect(result.map(s => s.id)).toEqual(['m'])
  })
})
