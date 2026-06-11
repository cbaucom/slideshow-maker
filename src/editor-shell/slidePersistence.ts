import type { MediaSlide, Slide } from '../timeline-core/types'
import { isTitleSlide } from '../timeline-core/types'
import type { GlobalSettings } from '../timeline-core'
import { SCHEMA_VERSION, type SlideshowJson } from '../project-store'

export function reconcileSlides(enumerated: MediaSlide[], saved: SlideshowJson): Slide[] {
  const byFilename = new Map(enumerated.map((slide) => [slide.filename, slide]))
  const ordered: Slide[] = []
  for (const savedSlide of saved.slides) {
    if (isTitleSlide(savedSlide as Slide)) {
      ordered.push({ ...(savedSlide as Slide), excluded: savedSlide.excluded ?? false })
      continue
    }
    if (!('filename' in savedSlide)) continue
    const live = byFilename.get(savedSlide.filename)
    if (live) {
      ordered.push({
        ...live,
        durationInFrames: savedSlide.durationInFrames,
        excluded: savedSlide.excluded ?? false,
        overrides: savedSlide.overrides,
      })
      byFilename.delete(savedSlide.filename)
    }
  }
  for (const slide of byFilename.values()) ordered.push(slide)
  return ordered
}

export function slidesToJson(
  globalSettings: GlobalSettings,
  slides: Slide[],
  soundtrackFilename?: string | null,
): SlideshowJson {
  return {
    globalSettings,
    schemaVersion: SCHEMA_VERSION,
    ...(soundtrackFilename ? { soundtrackFilename } : {}),
    slides: slides.map(slide => {
      if (isTitleSlide(slide)) {
        return {
          id: slide.id,
          kind: 'title' as const,
          heading: slide.heading,
          ...(slide.subtext !== undefined ? { subtext: slide.subtext } : {}),
          style: slide.style,
          durationInFrames: slide.durationInFrames,
          excluded: slide.excluded,
          ...(slide.overrides && Object.keys(slide.overrides).length > 0 ? { overrides: slide.overrides } : {}),
        }
      }
      return {
        id: slide.id,
        filename: slide.filename,
        type: slide.type,
        durationInFrames: slide.durationInFrames,
        excluded: slide.excluded,
        ...(slide.overrides && Object.keys(slide.overrides).length > 0 ? { overrides: slide.overrides } : {}),
      }
    }),
  }
}
