import type { Slide, TitleSlide } from './types'

export function moveSlide(slides: Slide[], fromIndex: number, toIndex: number): Slide[] {
  if (fromIndex === toIndex) return slides
  const result = [...slides]
  const [item] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, item)
  return result
}

export function moveSlidesToBeginning(slides: Slide[], indices: number[]): Slide[] {
  const selectedIndices = new Set(indices)
  if (selectedIndices.size === 0) return slides
  const selected = slides.filter((_, index) => selectedIndices.has(index))
  const rest = slides.filter((_, index) => !selectedIndices.has(index))
  return [...selected, ...rest]
}

export function moveSlidesToEnd(slides: Slide[], indices: number[]): Slide[] {
  const selectedIndices = new Set(indices)
  if (selectedIndices.size === 0) return slides
  const selected = slides.filter((_, index) => selectedIndices.has(index))
  const rest = slides.filter((_, index) => !selectedIndices.has(index))
  return [...rest, ...selected]
}

export function moveSlideBlock(slides: Slide[], fromIndices: number[], toIndex: number): Slide[] {
  const sortedFromIndices = [...new Set(fromIndices)].sort((left, right) => left - right)
  if (sortedFromIndices.length === 0) return slides
  if (sortedFromIndices.length === 1) return moveSlide(slides, sortedFromIndices[0], toIndex)

  const selectedIndices = new Set(sortedFromIndices)
  const moving = slides.filter((_, index) => selectedIndices.has(index))
  const without = slides.filter((_, index) => !selectedIndices.has(index))
  const insertPos = Math.min(toIndex, without.length)
  const result = [...without]
  result.splice(insertPos, 0, ...moving)
  return result
}

export function toggleExcluded(slides: Slide[], id: string): Slide[] {
  return slides.map(s => s.id === id ? { ...s, excluded: !s.excluded } : s)
}

export function filterIncluded(slides: Slide[]): Slide[] {
  return slides.filter(s => !s.excluded)
}

export function createTitleSlide(id: string, heading = 'New Title'): TitleSlide {
  return {
    id,
    kind: 'title',
    heading,
    style: 'dark',
    durationInFrames: 90,
    excluded: false,
  }
}
