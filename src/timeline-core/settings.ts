import { isTitleSlide } from './types'
import type { Slide } from './types'

export type TransitionType = 'crossfade' | 'dip-to-black' | 'cut'
export type FitMode = 'cover' | 'contain' | 'blur-fill'
export type KenBurnsMode = 'alternate' | 'zoom-in-only'
export type ThemeName = 'classic' | 'energetic' | 'plain'

export type GlobalSettings = {
  imageDurationSecs: number
  transitionType: TransitionType
  kenBurns: boolean
  fitMode: FitMode
  kenBurnsMode?: KenBurnsMode
}

export type SlideAudioOverrides = {
  muteMusic?: boolean
  muteVideoAudio?: boolean
  musicVolume?: number
  videoVolume?: number
}

export type SlideOverrides = Partial<GlobalSettings> & SlideAudioOverrides

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

export const THEMES: Record<ThemeName, GlobalSettings> = {
  classic: {
    imageDurationSecs: 4,
    transitionType: 'crossfade',
    kenBurns: true,
    fitMode: 'cover',
  },
  energetic: {
    imageDurationSecs: 2,
    transitionType: 'cut',
    kenBurns: true,
    fitMode: 'cover',
    kenBurnsMode: 'zoom-in-only',
  },
  plain: {
    imageDurationSecs: 5,
    transitionType: 'cut',
    kenBurns: false,
    fitMode: 'cover',
  },
}

export function applyTheme(name: ThemeName): GlobalSettings {
  return { ...THEMES[name] }
}

export function applyImageDuration(slides: Slide[], secs: number): Slide[] {
  const frames = Math.round(secs * FPS)
  return slides.map(s => {
    if (isTitleSlide(s)) return s
    if (s.type !== 'image') return s
    // Skip slides that have a per-slide override — the planner derives their duration from overrides.imageDurationSecs
    if (s.overrides?.imageDurationSecs !== undefined) return s
    return { ...s, durationInFrames: frames }
  })
}
