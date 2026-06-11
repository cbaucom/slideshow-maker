import type { FitMode, TransitionType } from '../timeline-core/settings'
import type { Slide } from '../timeline-core/types'

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
  slide: Slide
  startFrame: number
  durationInFrames: number
  transitionIn?: TransitionSpec
  fitMode: FitMode
  kenBurns: KenBurnsVector | null
}

export type SoundtrackTrack = {
  blobUrl: string
  durationInFrames: number
  volume: number
}

export type RenderPlan = {
  entries: RenderPlanEntry[]
  soundtrack?: SoundtrackTrack
  totalFrames: number
}

export type MediaMetadata = {
  durationInFrames?: number
}
