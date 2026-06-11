export type MediaType = 'image' | 'video'

const AUDIO_EXTENSIONS = new Set(['m4a', 'mp3', 'wav'])
const IMAGE_EXTENSIONS = new Set(['heic', 'jpeg', 'jpg', 'png'])
const VIDEO_EXTENSIONS = new Set(['mov', 'mp4'])

function ext(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

export function isSupportedAudio(filename: string): boolean {
  return AUDIO_EXTENSIONS.has(ext(filename))
}

export function isSupportedMedia(filename: string): boolean {
  const e = ext(filename)
  return IMAGE_EXTENSIONS.has(e) || VIDEO_EXTENSIONS.has(e)
}

export function getMediaType(filename: string): MediaType {
  const e = ext(filename)
  if (VIDEO_EXTENSIONS.has(e)) return 'video'
  return 'image'
}

export function sortByFilename(filenames: string[]): string[] {
  return [...filenames].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  )
}
