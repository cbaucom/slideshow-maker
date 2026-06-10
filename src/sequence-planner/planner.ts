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
  const entries: RenderPlanEntry[] = []
  let cursor = 0

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]
    const meta = mediaMetadata?.get(slide.filename)
    const durationInFrames = meta?.durationInFrames ?? slide.durationInFrames

    const transitionIn: TransitionSpec | undefined =
      i === 0
        ? undefined
        : { type: settings.transitionType, durationInFrames: transitionDur }

    entries.push({ slide, startFrame: cursor, durationInFrames, transitionIn })

    cursor += i < slides.length - 1 ? durationInFrames - transitionDur : durationInFrames
  }

  return { entries, totalFrames: cursor }
}
