import type { MutableRefObject } from 'react'

export type TimelineDragState = {
  fromIndices: number[]
  isDragging: boolean
}

export type TimelineDragRef = MutableRefObject<TimelineDragState | null>

export function startTimelineDrag(
  dragRef: TimelineDragRef,
  slideIndex: number,
  selectedSlideIds: ReadonlySet<string>,
  slides: Array<{ id: string }>,
): void {
  const selectedIndices = slides
    .map((slide, index) => (selectedSlideIds.has(slide.id) ? index : -1))
    .filter((index) => index !== -1)

  const fromIndices = selectedSlideIds.has(slides[slideIndex]?.id ?? '')
    ? selectedIndices
    : [slideIndex]

  dragRef.current = { fromIndices, isDragging: true }
}

export function finishTimelineDrag(
  dragRef: TimelineDragRef,
): TimelineDragState | null {
  const state = dragRef.current
  dragRef.current = null
  return state
}
