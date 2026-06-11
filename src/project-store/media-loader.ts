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

  const sorted = sortByFilename(files.map((f) => f.name))
  const filesByName = new Map(files.map((f) => [f.name, f]))

  const createdUrls: string[] = []
  try {
    const slides: MediaSlide[] = []
    for (const filename of sorted) {
      const file = filesByName.get(filename)!
      const type = getMediaType(filename)
      const blobUrl = URL.createObjectURL(file)
      createdUrls.push(blobUrl)

      const durationInFrames =
        type === 'video'
          ? await getVideoDurationFrames(file)
          : IMAGE_DURATION_FRAMES

      slides.push({
        id: `${filename}-${file.lastModified}`,
        filename,
        type,
        blobUrl,
        durationInFrames,
        excluded: false,
      })
    }
    return slides
  } catch (e) {
    createdUrls.forEach((url) => URL.revokeObjectURL(url))
    throw e
  }
}

export function revokeSlideBlobUrls(slides: Slide[]): void {
  slides.forEach((s) => { if (!isTitleSlide(s)) URL.revokeObjectURL(s.blobUrl) })
}
