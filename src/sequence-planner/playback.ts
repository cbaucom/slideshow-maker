import type { RenderPlan } from './types'

export function startFrameForSlideId(renderPlan: RenderPlan, slideId: string): number | null {
  const entry = renderPlan.entries.find((planEntry) => planEntry.slide.id === slideId)
  return entry?.startFrame ?? null
}

export function slideIdAtFrame(renderPlan: RenderPlan, frame: number): string | null {
  if (renderPlan.entries.length === 0) {
    return null
  }

  const clampedFrame = Math.max(0, Math.min(frame, Math.max(renderPlan.totalFrames - 1, 0)))
  let currentSlideId: string | null = null

  for (const entry of renderPlan.entries) {
    if (entry.startFrame <= clampedFrame) {
      currentSlideId = entry.slide.id
    } else {
      break
    }
  }

  return currentSlideId
}
