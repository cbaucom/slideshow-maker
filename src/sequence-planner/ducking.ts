import { isTitleSlide } from '../timeline-core/types'
import type { Slide } from '../timeline-core/types'
import type { DuckingEnvelope, RenderPlanEntry, VolumeKeyframe } from './types'

export const DUCK_LEVEL = 0.2
export const DUCK_RAMP_FRAMES = 6
export const FULL_VOLUME = 1

type SlideSpan = {
  duckEndFrame?: number
  duckLevel: number
  duckStartFrame?: number
  endFrame: number
  kind: 'duck' | 'hold' | 'mute'
  startFrame: number
}

export function buildDuckingEnvelope(entries: RenderPlanEntry[]): DuckingEnvelope {
  const spans = entries.flatMap(collectSlideSpan)
  const keyframes = spansToKeyframes(spans)
  const segments = spans
    .filter((span): span is SlideSpan & { kind: 'duck' } => span.kind === 'duck')
    .map((span) => ({
      duckEndFrame: span.duckEndFrame ?? span.endFrame,
      duckLevel: span.duckLevel,
      duckStartFrame: span.duckStartFrame ?? span.startFrame,
    }))

  return {
    keyframes,
    rampFrames: DUCK_RAMP_FRAMES,
    segments,
  }
}

function collectSlideSpan(entry: RenderPlanEntry): SlideSpan[] {
  const { durationInFrames, slide, startFrame } = entry
  const endFrame = startFrame + durationInFrames - 1
  const overrides = slide.overrides

  if (overrides?.muteMusic) {
    return [{ duckLevel: 0, endFrame, kind: 'mute', startFrame }]
  }

  if (overrides?.musicVolume !== undefined) {
    return [{
      duckLevel: overrides.musicVolume,
      endFrame,
      kind: 'hold',
      startFrame,
    }]
  }

  if (!isTitleSlide(slide) && slide.type === 'video' && !overrides?.muteVideoAudio) {
    const duckStartFrame = startFrame + DUCK_RAMP_FRAMES
    const duckEndFrame = endFrame - DUCK_RAMP_FRAMES
    if (duckEndFrame < duckStartFrame) {
      return [{
        duckLevel: DUCK_LEVEL,
        endFrame,
        kind: 'duck',
        startFrame,
      }]
    }
    return [{
      duckEndFrame,
      duckLevel: DUCK_LEVEL,
      duckStartFrame,
      endFrame,
      kind: 'duck',
      startFrame,
    }]
  }

  return []
}

function spansToKeyframes(spans: SlideSpan[]): VolumeKeyframe[] {
  const keyframes: VolumeKeyframe[] = [{ frame: 0, volume: FULL_VOLUME }]

  for (const span of spans) {
    if (span.kind === 'mute' || span.kind === 'hold') {
      pushKeyframe(keyframes, span.startFrame, span.duckLevel)
      pushKeyframe(keyframes, span.endFrame + 1, FULL_VOLUME)
      continue
    }

    const holdStart = span.duckStartFrame ?? span.startFrame
    const holdEnd = span.duckEndFrame ?? span.endFrame

    if (holdEnd < holdStart) {
      pushKeyframe(keyframes, span.startFrame, span.duckLevel)
      pushKeyframe(keyframes, span.endFrame + 1, FULL_VOLUME)
      continue
    }

    pushKeyframe(keyframes, span.startFrame, FULL_VOLUME)
    pushKeyframe(keyframes, holdStart, span.duckLevel)
    pushKeyframe(keyframes, holdEnd, span.duckLevel)
    pushKeyframe(keyframes, span.endFrame + 1, FULL_VOLUME)
  }

  return normalizeKeyframes(keyframes)
}

function pushKeyframe(keyframes: VolumeKeyframe[], frame: number, volume: number) {
  const last = keyframes[keyframes.length - 1]
  if (last && last.frame === frame) {
    last.volume = volume
    return
  }
  keyframes.push({ frame, volume })
}

function normalizeKeyframes(keyframes: VolumeKeyframe[]): VolumeKeyframe[] {
  const sorted = [...keyframes].sort((left, right) => left.frame - right.frame)
  const deduped: VolumeKeyframe[] = []

  for (const keyframe of sorted) {
    const last = deduped[deduped.length - 1]
    if (last && last.frame === keyframe.frame) {
      last.volume = keyframe.volume
      continue
    }
    deduped.push({ ...keyframe })
  }

  if (deduped.length === 0 || deduped[0].frame !== 0) {
    deduped.unshift({ frame: 0, volume: FULL_VOLUME })
  }

  return deduped
}

export function resolveVideoVolume(slide: Slide): number {
  if (isTitleSlide(slide) || slide.type !== 'video') return FULL_VOLUME
  if (slide.overrides?.muteVideoAudio) return 0
  return slide.overrides?.videoVolume ?? FULL_VOLUME
}

export function getUnmutedVideoAudioSpans(entries: RenderPlanEntry[]): Array<{
  endFrame: number
  startFrame: number
}> {
  return entries.flatMap((entry) => {
    const { durationInFrames, slide, startFrame } = entry
    if (isTitleSlide(slide) || slide.type !== 'video') return []
    if (slide.overrides?.muteVideoAudio || slide.overrides?.muteMusic) return []
    return [{ endFrame: startFrame + durationInFrames - 1, startFrame }]
  })
}
