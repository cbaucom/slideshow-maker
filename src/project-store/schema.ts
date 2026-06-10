export const SCHEMA_VERSION = 1
export const SLIDESHOW_FILE = 'slideshow.json'

export type SerializedSlide = {
  id: string
  filename: string
  type: 'image' | 'video'
  durationInFrames: number
}

export type SlideshowJson = {
  schemaVersion: number
  slides: SerializedSlide[]
}

export function isSlideshowJson(v: unknown): v is SlideshowJson {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o.schemaVersion === 'number' && Array.isArray(o.slides)
}
