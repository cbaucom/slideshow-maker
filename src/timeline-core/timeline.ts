import type { Slide, TitleSlide } from './types'

export function moveSlide(slides: Slide[], fromIndex: number, toIndex: number): Slide[] {
  if (fromIndex === toIndex) return slides
  const result = [...slides]
  const [item] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, item)
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
