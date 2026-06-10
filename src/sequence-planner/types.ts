import type { FitMode, TransitionType } from '../timeline-core/settings'
import type { MediaSlide } from '../timeline-core/types'

export type TransitionSpec = {
  type: TransitionType
  durationInFrames: number
}

export type KenBurnsVector = {
  fromScale: number
  toScale: number
  fromX: number
  fromY: number
  toX: number
  toY: number
}

export type RenderPlanEntry = {
  slide: MediaSlide
  startFrame: number
  durationInFrames: number
  transitionIn?: TransitionSpec
  fitMode: FitMode
  kenBurns: KenBurnsVector | null
}

export type RenderPlan = {
  entries: RenderPlanEntry[]
  totalFrames: number
}

export type MediaMetadata = {
  durationInFrames?: number
}
