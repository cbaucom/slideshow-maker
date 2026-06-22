import type { MediaType } from './media'
import type { SlideOverrides } from './settings'

export type { MediaType }

export type MediaSlide = {
  id: string
  filename: string
  type: MediaType
  /** blob URL for display/playback */
  blobUrl: string
  /** duration in frames at 30 fps */
  durationInFrames: number
  /** excluded from timeline but still in folder */
  excluded: boolean
  /** intrinsic pixel height when known */
  height?: number
  /** per-slide setting overrides; absent means "use global defaults" */
  overrides?: SlideOverrides
  /** intrinsic pixel width when known */
  width?: number
}

export type TitleSlide = {
  id: string
  kind: 'title'
  heading: string
  subtext?: string
  style: 'light' | 'dark'
  /** duration in frames at 30 fps */
  durationInFrames: number
  excluded: boolean
  overrides?: SlideOverrides
}

export type Slide = MediaSlide | TitleSlide

export type AudioClip = {
  filename: string
  gainDb?: number
}

export function isTitleSlide(s: Slide): s is TitleSlide {
  return 'kind' in s && (s as TitleSlide).kind === 'title'
}
