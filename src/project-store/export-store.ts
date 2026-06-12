// Exported videos live in an exports/ subfolder. Folder enumeration only reads
// top-level files, so exports never re-enter the media bin as slides.
export const EXPORTS_DIR = 'exports'

const FALLBACK_NAME = 'slideshow'

// Narrow interfaces so tests can inject in-memory fakes.
// Real FileSystemDirectoryHandle satisfies these structurally.
interface BlobWritable {
  write(data: Blob): Promise<void>
  close(): Promise<void>
}

interface BlobFileHandle {
  createWritable(): Promise<BlobWritable>
}

export interface ExportDirHandle {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<BlobFileHandle>
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<ExportDirHandle>
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function exportFilename(projectName: string, now: Date, extension: string): string {
  const name = projectName.trim() || FALLBACK_NAME
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  return `${name} ${date} ${time}.${extension}`
}

export async function writeExportedVideo(
  handle: ExportDirHandle,
  filename: string,
  blob: Blob,
): Promise<void> {
  const exportsDir = await handle.getDirectoryHandle(EXPORTS_DIR, { create: true })
  const fileHandle = await exportsDir.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(blob)
  await writable.close()
}
