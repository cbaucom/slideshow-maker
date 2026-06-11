import { JamendoError } from './client'

// Narrow interface matching both the real DirHandle and the fake used in tests.
interface WritableHandle {
  write(data: Blob): Promise<void>
  close(): Promise<void>
}
interface FileHandle {
  createWritable(): Promise<WritableHandle>
}
export interface DownloadDirHandle {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>
}

export function sanitizeFilename(name: string): string {
  const safe = name.replace(/[/\\:*?"<>|]/g, '_')
  return safe.endsWith('.mp3') ? safe : `${safe}.mp3`
}

export async function downloadTrack(
  audioUrl: string,
  filename: string,
  dirHandle: DownloadDirHandle,
): Promise<void> {
  const response = await fetch(audioUrl)
  if (!response.ok) {
    throw new JamendoError(`Download failed: ${response.status}`)
  }
  const blob = await response.blob()
  if (!blob.type.startsWith('audio/') && blob.type !== 'application/octet-stream' && blob.type !== '') {
    throw new JamendoError(`Unexpected content type: ${blob.type}`)
  }
  const fh = await dirHandle.getFileHandle(filename, { create: true })
  const writable = await fh.createWritable()
  await writable.write(blob)
  await writable.close()
}
