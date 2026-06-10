import { SCHEMA_VERSION, SLIDESHOW_FILE, isSlideshowJson, type SlideshowJson } from './schema'

// Narrow interfaces so tests can inject in-memory fakes.
// Real FileSystemDirectoryHandle satisfies these structurally.
interface Writable {
  write(data: string): Promise<void>
  close(): Promise<void>
}

// Only the subset of File we actually use (jsdom's File lacks .text())
interface Readable {
  text(): Promise<string>
}

interface FileHandle {
  getFile(): Promise<Readable>
  createWritable(): Promise<Writable>
}

export interface DirHandle {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>
}

export type OpenResult =
  | { status: 'ok'; data: SlideshowJson }
  | { status: 'corrupt'; error: string }

export function createFreshProject(): SlideshowJson {
  return { schemaVersion: SCHEMA_VERSION, slides: [] }
}

export async function openProject(handle: DirHandle): Promise<OpenResult> {
  let fh: FileHandle
  try {
    fh = await handle.getFileHandle(SLIDESHOW_FILE)
  } catch {
    return { status: 'ok', data: createFreshProject() }
  }

  try {
    const file = await fh.getFile()
    const text = await file.text()
    const parsed: unknown = JSON.parse(text)
    if (!isSlideshowJson(parsed)) {
      return { status: 'corrupt', error: 'Invalid slideshow.json: missing required fields' }
    }
    return { status: 'ok', data: parsed }
  } catch (e) {
    return {
      status: 'corrupt',
      error: e instanceof Error ? e.message : 'Failed to parse slideshow.json',
    }
  }
}

export async function saveProject(handle: DirHandle, data: SlideshowJson): Promise<void> {
  const fh = await handle.getFileHandle(SLIDESHOW_FILE, { create: true })
  const writable = await fh.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()
}
