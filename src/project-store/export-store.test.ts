import { describe, it, expect } from 'vitest'
import { EXPORTS_DIR, exportFilename, writeExportedVideo } from './export-store'

// --- In-memory FS fakes ---

class FakeBlobWritable {
  public written: Blob | null = null
  public closed = false
  async write(data: Blob) { this.written = data }
  async close() { this.closed = true }
}

class FakeBlobFileHandle {
  public writable = new FakeBlobWritable()
  async createWritable(): Promise<FakeBlobWritable> {
    this.writable = new FakeBlobWritable()
    return this.writable
  }
}

class FakeExportDirHandle {
  public files = new Map<string, FakeBlobFileHandle>()
  public dirs = new Map<string, FakeExportDirHandle>()

  async getFileHandle(name: string, opts?: { create?: boolean }): Promise<FakeBlobFileHandle> {
    let fh = this.files.get(name)
    if (!fh) {
      if (!opts?.create) throw new DOMException('File not found', 'NotFoundError')
      fh = new FakeBlobFileHandle()
      this.files.set(name, fh)
    }
    return fh
  }

  async getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<FakeExportDirHandle> {
    let dir = this.dirs.get(name)
    if (!dir) {
      if (!opts?.create) throw new DOMException('Directory not found', 'NotFoundError')
      dir = new FakeExportDirHandle()
      this.dirs.set(name, dir)
    }
    return dir
  }
}

// --- Tests ---

describe('exportFilename', () => {
  it('combines project name, timestamp, and extension into a filename', () => {
    const name = exportFilename('Hawaii Trip', new Date(2026, 5, 12, 14, 30, 5), 'mp4')
    expect(name).toBe('Hawaii Trip 2026-06-12 14-30-05.mp4')
  })

  it('uses the given extension', () => {
    const name = exportFilename('Hawaii Trip', new Date(2026, 5, 12, 14, 30, 5), 'webm')
    expect(name).toBe('Hawaii Trip 2026-06-12 14-30-05.webm')
  })

  it('zero-pads single-digit date and time parts', () => {
    const name = exportFilename('p', new Date(2026, 0, 2, 3, 4, 5), 'mp4')
    expect(name).toBe('p 2026-01-02 03-04-05.mp4')
  })

  it('falls back to "slideshow" for an empty project name', () => {
    const name = exportFilename('', new Date(2026, 5, 12, 14, 30, 5), 'mp3')
    expect(name).toBe('slideshow 2026-06-12 14-30-05.mp3')
  })
})

describe('writeExportedVideo', () => {
  it('writes the blob into the exports/ subfolder, not the project root', async () => {
    const root = new FakeExportDirHandle()
    const blob = new Blob(['video-bytes'], { type: 'video/mp4' })

    await writeExportedVideo(root, 'show.mp4', blob)

    expect(root.files.size).toBe(0)
    const exportsDir = root.dirs.get(EXPORTS_DIR)
    expect(exportsDir).toBeDefined()
    const fh = exportsDir!.files.get('show.mp4')
    expect(fh).toBeDefined()
    expect(fh!.writable.written).toBe(blob)
    expect(fh!.writable.closed).toBe(true)
  })

  it('reuses an existing exports/ directory', async () => {
    const root = new FakeExportDirHandle()
    await writeExportedVideo(root, 'a.mp4', new Blob(['a'], { type: 'video/mp4' }))
    await writeExportedVideo(root, 'b.mp4', new Blob(['b'], { type: 'video/mp4' }))

    expect(root.dirs.size).toBe(1)
    expect(root.dirs.get(EXPORTS_DIR)!.files.size).toBe(2)
  })
})
