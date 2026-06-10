export type MediaType = 'image' | 'video'

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'heic'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov'])

function ext(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? ''
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
