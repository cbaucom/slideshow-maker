import type { BeatGrid, BeatGridCache } from '../beat-grid/types'
import type { LoudnessCache } from '../audio-analysis/types'
import type { AudioClip, MediaSlide, Slide } from '../timeline-core/types'
import { isTitleSlide } from '../timeline-core/types'
import type { AspectRatio, GlobalSettings, ThemeName } from '../timeline-core'
import { SCHEMA_VERSION, type SlideshowJson } from '../project-store'
import type { JamendoAttribution } from '../jamendo/types'

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

export function audioClipsFromJson(saved: SlideshowJson): AudioClip[] {
  if (saved.audioClips?.length) {
    return saved.audioClips.map((clip) => ({
      filename: clip.filename,
      ...(clip.gainDb !== undefined ? { gainDb: clip.gainDb } : {}),
    }))
  }
  if (saved.soundtrackFilename) {
    return [{ filename: saved.soundtrackFilename }]
  }
  return []
}

function isLegacyBeatGrid(value: unknown): value is BeatGrid {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.bpm === 'number'
}

export function beatGridCacheFromJson(saved: SlideshowJson): BeatGridCache | undefined {
  const raw = saved.beatGridCache as BeatGrid | BeatGridCache | undefined
  if (!raw) return undefined
  if (isLegacyBeatGrid(raw)) {
    const filename = saved.audioClips?.[0]?.filename ?? saved.soundtrackFilename
    return filename ? { [filename]: raw } : undefined
  }
  return raw
}

export function slidesToJson(
  globalSettings: GlobalSettings,
  slides: Slide[],
  audioClips?: AudioClip[] | null,
  themeName?: ThemeName | null,
  soundtrackAttribution?: JamendoAttribution | null,
  aspectRatio?: AspectRatio | null,
  beatGridCache?: BeatGridCache | null,
  manualBeatGrid?: BeatGrid | null,
  loudnessCache?: LoudnessCache | null,
): SlideshowJson {
  return {
    globalSettings,
    schemaVersion: SCHEMA_VERSION,
    ...(aspectRatio ? { aspectRatio } : {}),
    ...(audioClips?.length
      ? {
          audioClips: audioClips.map((clip) => ({
            filename: clip.filename,
            ...(clip.gainDb !== undefined ? { gainDb: clip.gainDb } : {}),
          })),
        }
      : {}),
    ...(beatGridCache && Object.keys(beatGridCache).length > 0 ? { beatGridCache } : {}),
    ...(loudnessCache && Object.keys(loudnessCache).length > 0 ? { loudnessCache } : {}),
    ...(manualBeatGrid ? { manualBeatGrid } : {}),
    ...(themeName ? { themeName } : {}),
    ...(soundtrackAttribution ? { soundtrackAttribution } : {}),
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
