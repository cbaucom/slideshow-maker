import type { GlobalSettings, TransitionType } from '../timeline-core/settings'
import type { MediaSlide } from '../timeline-core/types'
import type { MediaMetadata, RenderPlan, RenderPlanEntry, TransitionSpec } from './types'

export const TRANSITION_FRAMES: Record<TransitionType, number> = {
  crossfade: 15,
  'dip-to-black': 30,
  cut: 0,
}

export function plan(
  slides: MediaSlide[],
  settings: GlobalSettings,
  mediaMetadata?: Map<string, MediaMetadata>,
): RenderPlan {
  if (slides.length === 0) return { entries: [], totalFrames: 0 }

  const transitionDur = TRANSITION_FRAMES[settings.transitionType]

  function getDuration(slide: MediaSlide): number {
    return mediaMetadata?.get(slide.filename)?.durationInFrames ?? slide.durationInFrames
  }

  // Pass 1: compute effective transition duration for each non-first slide.
  // Clamp to half of each adjacent slide so the transition never consumes
  // more than the slide it belongs to (Remotion requirement).
  const effectiveTrans: number[] = slides.map((slide, i) => {
    if (i === 0) return 0
    const prevDur = getDuration(slides[i - 1])
    const currDur = getDuration(slide)
    return Math.min(transitionDur, Math.floor(prevDur / 2), Math.floor(currDur / 2))
  })

  // Pass 2: build entries.
  const entries: RenderPlanEntry[] = []
  let cursor = 0

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]
    const durationInFrames = getDuration(slide)

    const transitionIn: TransitionSpec | undefined =
      i === 0
        ? undefined
        : { type: settings.transitionType, durationInFrames: effectiveTrans[i] }

    entries.push({ slide, startFrame: cursor, durationInFrames, transitionIn })

    // Advance by this slide's duration minus the NEXT slide's inbound transition overlap.
    if (i < slides.length - 1) {
      cursor += durationInFrames - effectiveTrans[i + 1]
    } else {
      cursor += durationInFrames
    }
  }

  return { entries, totalFrames: cursor }
}
