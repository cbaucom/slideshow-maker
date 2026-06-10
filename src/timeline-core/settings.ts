import { isTitleSlide } from './types'
import type { Slide } from './types'

export type TransitionType = 'crossfade' | 'dip-to-black' | 'cut'
export type FitMode = 'cover' | 'contain' | 'blur-fill'

export type GlobalSettings = {
  imageDurationSecs: number
  transitionType: TransitionType
  kenBurns: boolean
  fitMode: FitMode
}

export type SlideOverrides = Partial<GlobalSettings>

export type ResolvedSlideSettings = GlobalSettings

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  imageDurationSecs: 3,
  transitionType: 'crossfade',
  kenBurns: true,
  fitMode: 'cover',
}

const FPS = 30

export function resolve(
  global: GlobalSettings,
  overrides?: SlideOverrides,
): ResolvedSlideSettings {
  if (!overrides) return { ...global }
  // Filter out undefined values so absent override keys don't shadow the global
  const defined = Object.fromEntries(
    Object.entries(overrides).filter(([, v]) => v !== undefined),
  )
  return { ...global, ...defined }
}

export function applyImageDuration(slides: Slide[], secs: number): Slide[] {
  const frames = Math.round(secs * FPS)
  return slides.map(s => {
    if (isTitleSlide(s)) return s
    return s.type === 'image' ? { ...s, durationInFrames: frames } : s
  })
}
