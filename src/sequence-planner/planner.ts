import type { FitMode, GlobalSettings, TransitionType } from '../timeline-core/settings'
import type { MediaSlide } from '../timeline-core/types'
import type { KenBurnsVector, MediaMetadata, RenderPlan, RenderPlanEntry, TransitionSpec } from './types'

export const TRANSITION_FRAMES: Record<TransitionType, number> = {
  crossfade: 15,
  'dip-to-black': 30,
  cut: 0,
}

// 4 Ken Burns presets cycling by slide index. Even indices zoom-in, odd zoom-out.
// Pan offsets are fractional (0.05 = 5% of the slide dimension).
const KB_PRESETS: KenBurnsVector[] = [
  { fromScale: 1.0, toScale: 1.12, fromX: -0.03, fromY: 0.02, toX: 0.03, toY: -0.02 },
  { fromScale: 1.12, toScale: 1.0, fromX: 0.03, fromY: -0.02, toX: -0.03, toY: 0.02 },
  { fromScale: 1.0, toScale: 1.12, fromX: 0.03, fromY: 0.02, toX: -0.03, toY: -0.02 },
  { fromScale: 1.12, toScale: 1.0, fromX: -0.03, fromY: 0.02, toX: 0.03, toY: -0.02 },
]

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

  function getFitMode(slide: MediaSlide): FitMode {
    return slide.type === 'video' ? 'contain' : settings.fitMode
  }

  function getKenBurns(slide: MediaSlide, index: number): KenBurnsVector | null {
    if (!settings.kenBurns || slide.type === 'video') return null
    return KB_PRESETS[index % KB_PRESETS.length]
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

    entries.push({
      slide,
      startFrame: cursor,
      durationInFrames,
      transitionIn,
      fitMode: getFitMode(slide),
      kenBurns: getKenBurns(slide, i),
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
