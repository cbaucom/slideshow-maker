import type { AspectRatio } from '../timeline-core/aspect'
import type { GlobalSettings, SlideOverrides, ThemeName } from '../timeline-core/settings'
import type { BeatGrid } from '../beat-grid/types'
import type { JamendoAttribution } from '../jamendo/types'

export const SCHEMA_VERSION = 1
export const SLIDESHOW_FILE = 'slideshow.json'

export type SerializedMediaSlide = {
  id: string
  filename: string
  type: 'image' | 'video'
  durationInFrames: number
  excluded?: boolean
  overrides?: SlideOverrides
}

export type SerializedTitleSlide = {
  id: string
  kind: 'title'
  heading: string
  subtext?: string
  style: 'light' | 'dark'
  durationInFrames: number
  excluded?: boolean
  overrides?: SlideOverrides
}

export type SerializedSlide = SerializedMediaSlide | SerializedTitleSlide

export type SerializedAudioClip = {
  filename: string
  gainDb?: number
}

export type SlideshowJson = {
  aspectRatio?: AspectRatio
  audioClips?: SerializedAudioClip[]
  globalSettings?: GlobalSettings
  schemaVersion: number
  slides: SerializedSlide[]
  soundtrackFilename?: string
  themeName?: ThemeName
  beatGridCache?: BeatGrid
  manualBeatGrid?: BeatGrid
  soundtrackAttribution?: JamendoAttribution
}

export function isSlideshowJson(v: unknown): v is SlideshowJson {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o.schemaVersion === 'number' && Array.isArray(o.slides)
}
