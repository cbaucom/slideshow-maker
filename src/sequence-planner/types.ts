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

export type VolumeKeyframe = {
  frame: number
  volume: number
}

export type DuckingSegment = {
  duckEndFrame: number
  duckLevel: number
  duckStartFrame: number
}

export type DuckingEnvelope = {
  keyframes: VolumeKeyframe[]
  rampFrames: number
  segments: DuckingSegment[]
}

export type RenderPlanEntry = {
  slide: Slide
  startFrame: number
  durationInFrames: number
  transitionIn?: TransitionSpec
  fitMode: FitMode
  kenBurns: KenBurnsVector | null
  videoVolume: number
}

export type SoundtrackTrack = {
  blobUrl: string
  duckingEnvelope: DuckingEnvelope
  durationInFrames: number
}

export type RenderPlan = {
  entries: RenderPlanEntry[]
  soundtrack?: SoundtrackTrack
  totalFrames: number
}

export type MediaMetadata = {
  durationInFrames?: number
}
