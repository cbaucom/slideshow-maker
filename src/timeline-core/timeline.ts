import type { MediaSlide } from './types'

export function moveSlide(slides: MediaSlide[], fromIndex: number, toIndex: number): MediaSlide[] {
  if (fromIndex === toIndex) return slides
  const result = [...slides]
  const [item] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, item)
  return result
}

export function toggleExcluded(slides: MediaSlide[], id: string): MediaSlide[] {
  return slides.map(s => s.id === id ? { ...s, excluded: !s.excluded } : s)
}

export function filterIncluded(slides: MediaSlide[]): MediaSlide[] {
  return slides.filter(s => !s.excluded)
}
