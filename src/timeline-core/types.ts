import type { MediaType } from './media'

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
}
