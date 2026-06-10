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
  /** per-slide setting overrides; absent means "use global defaults" */
  overrides?: SlideOverrides
}
