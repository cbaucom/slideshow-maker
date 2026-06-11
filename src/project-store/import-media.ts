import { isSupportedMedia } from '../timeline-core'
import type { MediaSlide } from '../timeline-core/types'
import { createMediaSlideFromFile } from './media-loader'

interface WritableHandle {
  close(): Promise<void>
  write(data: Blob): Promise<void>
}

interface ImportFileHandle {
  createWritable(): Promise<WritableHandle>
}

export interface ImportDirHandle {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<ImportFileHandle>
}

export type SkippedImport = {
  filename: string
  reason: 'unsupported-type'
}

export type ImportDroppedMediaResult = {
  imported: MediaSlide[]
  skipped: SkippedImport[]
}

export function resolveUniqueFilename(
  existingFilenames: ReadonlySet<string>,
  desiredFilename: string,
): string {
  if (!existingFilenames.has(desiredFilename)) return desiredFilename

  const dotIndex = desiredFilename.lastIndexOf('.')
  const base = dotIndex > 0 ? desiredFilename.slice(0, dotIndex) : desiredFilename
  const extension = dotIndex > 0 ? desiredFilename.slice(dotIndex) : ''

  let counter = 1
  while (true) {
    const candidate = `${base}-${counter}${extension}`
    if (!existingFilenames.has(candidate)) return candidate
    counter += 1
  }
}

export async function importDroppedMediaFiles(
  dirHandle: ImportDirHandle,
  files: File[],
  existingFilenames: ReadonlySet<string>,
): Promise<ImportDroppedMediaResult> {
  const imported: MediaSlide[] = []
  const skipped: SkippedImport[] = []
  const reservedFilenames = new Set(existingFilenames)

  for (const file of files) {
    if (!isSupportedMedia(file.name)) {
      skipped.push({ filename: file.name, reason: 'unsupported-type' })
      continue
    }

    const filename = resolveUniqueFilename(reservedFilenames, file.name)
    reservedFilenames.add(filename)

    const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(file)
    await writable.close()

    const namedFile = new File([file], filename, {
      lastModified: file.lastModified,
      type: file.type,
    })
    imported.push(await createMediaSlideFromFile(namedFile))
  }

  return { imported, skipped }
}
