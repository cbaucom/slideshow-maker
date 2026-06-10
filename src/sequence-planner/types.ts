import type { TransitionType } from '../timeline-core/settings'
import type { MediaSlide } from '../timeline-core/types'

export type TransitionSpec = {
  type: TransitionType
  durationInFrames: number
}

export type RenderPlanEntry = {
  slide: MediaSlide
  startFrame: number
  durationInFrames: number
  transitionIn?: TransitionSpec
}

export type RenderPlan = {
  entries: RenderPlanEntry[]
  totalFrames: number
}

export type MediaMetadata = {
  durationInFrames?: number
}
