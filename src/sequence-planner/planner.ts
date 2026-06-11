import { resolve } from '../timeline-core/settings'
import type { FitMode, GlobalSettings, TransitionType } from '../timeline-core/settings'
import { isTitleSlide } from '../timeline-core/types'
import type { Slide } from '../timeline-core/types'
import type { KenBurnsVector, MediaMetadata, RenderPlan, RenderPlanEntry, TransitionSpec } from './types'

const FPS = 30

export const TRANSITION_FRAMES: Record<TransitionType, number> = {
  crossfade: 15,
  'dip-to-black': 30,
  cut: 0,
}

// 4 Ken Burns presets cycling by photo index (videos excluded from the counter).
// Each preset has a unique pan direction. Even presets zoom-in, odd zoom-out.
const KB_PRESETS: KenBurnsVector[] = [
  { fromScale: 1.0, toScale: 1.12, fromX: -0.03, fromY: 0.02, toX: 0.03, toY: -0.02 },   // in, bottom-left→top-right
  { fromScale: 1.12, toScale: 1.0, fromX: 0.03, fromY: -0.02, toX: -0.03, toY: 0.02 },   // out, top-right→bottom-left
  { fromScale: 1.0, toScale: 1.12, fromX: 0.03, fromY: 0.02, toX: -0.03, toY: -0.02 },   // in, bottom-right→top-left
  { fromScale: 1.12, toScale: 1.0, fromX: -0.03, fromY: -0.02, toX: 0.03, toY: 0.02 },   // out, top-left→bottom-right
]

export function plan(
  slides: Slide[],
  settings: GlobalSettings,
  mediaMetadata?: Map<string, MediaMetadata>,
): RenderPlan {
  if (slides.length === 0) return { entries: [], totalFrames: 0 }


  function resolved(slide: Slide) {
    return resolve(settings, slide.overrides)
  }

  function getDuration(slide: Slide): number {
    if (isTitleSlide(slide)) return slide.durationInFrames
    const meta = mediaMetadata?.get(slide.filename)?.durationInFrames
    if (meta !== undefined) return meta
    // For images, honour a per-slide imageDurationSecs override.
    if (slide.type === 'image' && slide.overrides?.imageDurationSecs !== undefined) {
      return Math.round(resolved(slide).imageDurationSecs * FPS)
    }
    return slide.durationInFrames
  }

  function getFitMode(slide: Slide): FitMode {
    if (isTitleSlide(slide)) return 'cover' // unused; TitleSlideView renders its own layout
    return slide.type === 'video' ? 'contain' : resolved(slide).fitMode
  }

  // Per-slide resolved transition duration (inbound = this slide's resolved type).
  function getTransitionDur(slide: Slide): number {
    return TRANSITION_FRAMES[resolved(slide).transitionType]
  }

  // Pass 1: compute effective transition duration for each non-first slide.
  // Clamp to half of each adjacent slide so the transition never consumes
  // more than the slide it belongs to (Remotion requirement).
  const effectiveTrans: number[] = slides.map((slide, i) => {
    if (i === 0) return 0
    const prevDur = getDuration(slides[i - 1])
    const currDur = getDuration(slide)
    const tDur = getTransitionDur(slide)
    return Math.min(tDur, Math.floor(prevDur / 2), Math.floor(currDur / 2))
  })

  // Pass 2: build entries.
  // photoIndex counts only non-video slides so Ken Burns presets alternate
  // correctly even when photos and videos are interspersed.
  const entries: RenderPlanEntry[] = []
  let cursor = 0
  let photoIndex = 0

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]
    const durationInFrames = getDuration(slide)
    const slideResolved = resolved(slide)

    const transitionIn: TransitionSpec | undefined =
      i === 0
        ? undefined
        : { type: slideResolved.transitionType, durationInFrames: effectiveTrans[i] }

    const kenBurns: KenBurnsVector | null =
      !isTitleSlide(slide) && slideResolved.kenBurns && slide.type !== 'video'
        ? KB_PRESETS[photoIndex % KB_PRESETS.length]
        : null

    if (!isTitleSlide(slide) && slide.type !== 'video') photoIndex++

    entries.push({
      slide,
      startFrame: cursor,
      durationInFrames,
      transitionIn,
      fitMode: getFitMode(slide),
      kenBurns,
    })

    // Advance by this slide's duration minus the NEXT slide's inbound transition overlap.
    if (i < slides.length - 1) {
      cursor += durationInFrames - effectiveTrans[i + 1]
    } else {
      cursor += durationInFrames
    }
  }

  return { entries, totalFrames: cursor }
}
