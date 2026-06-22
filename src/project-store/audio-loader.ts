import { Input, ALL_FORMATS, BlobSource } from 'mediabunny'
import { isSupportedAudio, sortByFilename } from '../timeline-core'

const FPS = 30
const FALLBACK_AUDIO_FRAMES = 30 * FPS

export type AudioTrack = {
  blobUrl: string
  byteLength: number
  durationInFrames: number
  filename: string
}

async function getAudioDurationFrames(file: File): Promise<number> {
  try {
    const input = new Input({
      formats: ALL_FORMATS,
      source: new BlobSource(file),
    })
    const seconds = await input.computeDuration()
    return Math.max(1, Math.ceil(seconds * FPS))
  } catch {
    return FALLBACK_AUDIO_FRAMES
  }
}

export async function enumerateAudioTracks(
  dirHandle: FileSystemDirectoryHandle,
): Promise<AudioTrack[]> {
  const files: File[] = []

  for await (const entry of dirHandle.values()) {
    if (entry.kind !== 'file') continue
    if (!isSupportedAudio(entry.name)) continue
    const file = await (entry as FileSystemFileHandle).getFile()
    files.push(file)
  }

  const sorted = sortByFilename(files.map((file) => file.name))
  const filesByName = new Map(files.map((file) => [file.name, file]))
  const createdUrls: string[] = []

  try {
    const tracks: AudioTrack[] = []
    for (const filename of sorted) {
      const file = filesByName.get(filename)!
      const blobUrl = URL.createObjectURL(file)
      createdUrls.push(blobUrl)
      const durationInFrames = await getAudioDurationFrames(file)
      tracks.push({ blobUrl, byteLength: file.size, durationInFrames, filename })
    }
    return tracks
  } catch (error) {
    createdUrls.forEach((url) => URL.revokeObjectURL(url))
    throw error
  }
}

export function revokeAudioBlobUrls(tracks: AudioTrack[]): void {
  tracks.forEach((track) => URL.revokeObjectURL(track.blobUrl))
}
