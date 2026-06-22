import { resolve } from '../timeline-core/settings'
import type { FitMode, GlobalSettings, TransitionType } from '../timeline-core/settings'
import { isTitleSlide } from '../timeline-core/types'
import type { Slide } from '../timeline-core/types'
import type { BeatGrid } from '../beat-grid/types'
import { nudge } from '../beat-grid/nudge'
import { nudgeSlideEndFrame } from '../beat-grid/nudge-position'
import { buildDuckingEnvelope, resolveVideoVolume } from './ducking'
import type {
  AudioSegment,
  KenBurnsVector,
  MediaMetadata,
  RenderPlan,
  RenderPlanEntry,
  TransitionSpec,
} from './types'

export type AudioClipInput = {
  blobUrl: string
  durationInFrames: number
  gainDb?: number
}

export { DUCK_LEVEL, DUCK_RAMP_FRAMES, FULL_VOLUME, getUnmutedVideoAudioSpans } from './ducking'

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

const KB_ZOOM_IN_PRESETS: KenBurnsVector[] = [KB_PRESETS[0], KB_PRESETS[2]]

function totalAudioFrames(audioClips?: AudioClipInput[]): number {
  if (!audioClips?.length) return 0
  return audioClips.reduce((sum, clip) => sum + clip.durationInFrames, 0)
}

function computePassDuration(slideDurations: number[], effectiveTrans: number[]): number {
  let cursor = 0
  for (let index = 0; index < slideDurations.length; index++) {
    if (index < slideDurations.length - 1) {
      cursor += slideDurations[index] - effectiveTrans[index + 1]
    } else {
      cursor += slideDurations[index]
    }
  }
  return cursor
}

function loopBoundaryTransition(
  prevDuration: number,
  currDuration: number,
  transitionType: TransitionType,
  maxTransitionDur: number,
): TransitionSpec | undefined {
  const transDur = Math.min(
    maxTransitionDur,
    Math.floor(prevDuration / 2),
    Math.floor(currDuration / 2),
  )
  if (transDur <= 0) return undefined
  return { type: transitionType, durationInFrames: transDur }
}

function buildAudioOutput(
  entries: RenderPlanEntry[],
  audioClips?: AudioClipInput[],
): Pick<RenderPlan, 'audioSegments' | 'duckingEnvelope'> {
  if (!audioClips?.length) return {}

  const duckingEnvelope = buildDuckingEnvelope(entries)
  const audioSegments: AudioSegment[] = []
  let startFrame = 0

  for (const clip of audioClips) {
    audioSegments.push({
      blobUrl: clip.blobUrl,
      durationInFrames: clip.durationInFrames,
      gainDb: clip.gainDb ?? 0,
      startFrame,
    })
    startFrame += clip.durationInFrames
  }

  return { audioSegments, duckingEnvelope }
}

export function plan(
  slides: Slide[],
  settings: GlobalSettings,
  mediaMetadata?: Map<string, MediaMetadata>,
  audioClips?: AudioClipInput[],
  beatGrid?: BeatGrid,
  concatenatedBeatTimesSecs?: number[],
): RenderPlan {
  if (slides.length === 0) {
    const audioTotal = totalAudioFrames(audioClips)
    return {
      entries: [],
      ...buildAudioOutput([], audioClips),
      totalFrames: audioTotal,
    }
  }


  function resolved(slide: Slide) {
    return resolve(settings, slide.overrides)
  }

  const beatSyncActive = settings.beatSync !== false
    && (beatGrid !== undefined || (concatenatedBeatTimesSecs?.length ?? 0) > 0)

  function getRawDuration(slide: Slide): number {
    if (isTitleSlide(slide)) return slide.durationInFrames
    const meta = mediaMetadata?.get(slide.filename)?.durationInFrames
    if (meta !== undefined) return meta
    let raw = slide.durationInFrames
    if (slide.type === 'image' && slide.overrides?.imageDurationSecs !== undefined) {
      raw = Math.round(resolved(slide).imageDurationSecs * FPS)
    }
    return raw
  }

  function getDuration(slide: Slide, startFrame: number): number {
    const raw = getRawDuration(slide)
    if (beatSyncActive && !isTitleSlide(slide) && slide.type !== 'video') {
      const energy = resolved(slide).energy ?? 'medium'
      if (concatenatedBeatTimesSecs?.length) {
        return nudgeSlideEndFrame(startFrame, raw, concatenatedBeatTimesSecs, energy, FPS)
      }
      if (beatGrid) {
        return nudge(raw, beatGrid, energy, FPS)
      }
    }
    return raw
  }

  function getFitMode(slide: Slide): FitMode {
    if (isTitleSlide(slide)) return 'cover' // unused; TitleSlideView renders its own layout
    return slide.type === 'video' ? 'contain' : resolved(slide).fitMode
  }

  function getTransitionDur(slide: Slide): number {
    return TRANSITION_FRAMES[resolved(slide).transitionType]
  }

  const slideDurations = slides.map((slide) => (
    concatenatedBeatTimesSecs?.length ? getRawDuration(slide) : getDuration(slide, 0)
  ))
  const effectiveTrans = slides.map((slide, index) => {
    if (index === 0) return 0
    const transitionDur = getTransitionDur(slide)
    return Math.min(
      transitionDur,
      Math.floor(slideDurations[index - 1] / 2),
      Math.floor(slideDurations[index] / 2),
    )
  })

  const passDuration = computePassDuration(slideDurations, effectiveTrans)
  const audioTotal = totalAudioFrames(audioClips)
  const totalFrames = audioClips?.length
    ? Math.max(passDuration, audioTotal)
    : passDuration

  const entries: RenderPlanEntry[] = []
  let cursor = 0
  let photoIndex = 0

  while (cursor < totalFrames) {
    for (let index = 0; index < slides.length; index++) {
      if (cursor >= totalFrames) break

      const slide = slides[index]
      const fullDuration = getDuration(slide, cursor)
      const remaining = totalFrames - cursor
      const durationInFrames = Math.min(fullDuration, remaining)
      const slideResolved = resolved(slide)
      const isLoopStart = entries.length > 0 && index === 0

      let transitionIn: TransitionSpec | undefined
      if (index === 0 && isLoopStart) {
        transitionIn = loopBoundaryTransition(
          slideDurations[slides.length - 1],
          fullDuration,
          slideResolved.transitionType,
          getTransitionDur(slide),
        )
      } else if (index > 0 && durationInFrames === fullDuration) {
        transitionIn = {
          type: slideResolved.transitionType,
          durationInFrames: effectiveTrans[index],
        }
      }

      const kbPresets =
        slideResolved.kenBurnsMode === 'zoom-in-only' ? KB_ZOOM_IN_PRESETS : KB_PRESETS
      const kenBurns: KenBurnsVector | null =
        !isTitleSlide(slide) && slideResolved.kenBurns && slide.type !== 'video'
          ? kbPresets[photoIndex % kbPresets.length]
          : null

      if (!isTitleSlide(slide) && slide.type !== 'video') photoIndex++

      entries.push({
        slide,
        startFrame: cursor,
        durationInFrames,
        transitionIn,
        fitMode: getFitMode(slide),
        kenBurns,
        videoVolume: resolveVideoVolume(slide),
      })

      const hasNextInPass = index < slides.length - 1
      const isFullSlide = durationInFrames === fullDuration
      if (hasNextInPass && isFullSlide && cursor + durationInFrames < totalFrames) {
        cursor += durationInFrames - effectiveTrans[index + 1]
      } else {
        cursor += durationInFrames
      }
    }
  }

  return {
    entries,
    ...buildAudioOutput(entries, audioClips),
    totalFrames,
  }
}
