import { Input, ALL_FORMATS, BlobSource } from 'mediabunny'
import { isSupportedMedia, getMediaType, sortByFilename } from '../timeline-core'
import { isTitleSlide } from '../timeline-core/types'
import type { Slide } from '../timeline-core/types'
import type { MediaSlide } from '../timeline-core/types'

const FPS = 30
const IMAGE_DURATION_FRAMES = 3 * FPS // 3s at 30fps
// The planner clamps transitions per-pair, so any video length is safe — but
// very short videos yield very short effective transitions (odd UX). 16 is a
// practical floor; see TRANSITION_FRAMES in sequence-planner/planner.ts.
const MIN_VIDEO_FRAMES = 16

async function getVideoDurationFrames(file: File): Promise<number> {
  try {
    const input = new Input({
      formats: ALL_FORMATS,
      source: new BlobSource(file),
    })
    const seconds = await input.computeDuration()
    return Math.max(MIN_VIDEO_FRAMES, Math.ceil(seconds * FPS))
  } catch {
    // Fall back to image duration if the video container can't be parsed.
    return IMAGE_DURATION_FRAMES
  }
}

export async function createMediaSlideFromFile(file: File): Promise<MediaSlide> {
  const filename = file.name
  const type = getMediaType(filename)
  const blobUrl = URL.createObjectURL(file)
  const durationInFrames =
    type === 'video'
      ? await getVideoDurationFrames(file)
      : IMAGE_DURATION_FRAMES

  return {
    blobUrl,
    durationInFrames,
    excluded: false,
    filename,
    id: `${filename}-${file.lastModified}`,
    type,
  }
}

export async function enumerateFolder(
  dirHandle: FileSystemDirectoryHandle,
): Promise<MediaSlide[]> {
  const files: File[] = []

  for await (const entry of dirHandle.values()) {
    if (entry.kind !== 'file') continue
    if (!isSupportedMedia(entry.name)) continue
    const file = await (entry as FileSystemFileHandle).getFile()
    files.push(file)
  }

  const sorted = sortByFilename(files.map((file) => file.name))
  const filesByName = new Map(files.map((file) => [file.name, file]))

  const createdUrls: string[] = []
  try {
    const slides = await Promise.all(
      sorted.map(async (filename) => {
        const file = filesByName.get(filename)!
        const slide = await createMediaSlideFromFile(file)
        createdUrls.push(slide.blobUrl)
        return slide
      }),
    )
    return slides
  } catch (error) {
    createdUrls.forEach((url) => URL.revokeObjectURL(url))
    throw error
  }
}

export function revokeSlideBlobUrls(slides: Slide[]): void {
  slides.forEach((s) => { if (!isTitleSlide(s)) URL.revokeObjectURL(s.blobUrl) })
}
