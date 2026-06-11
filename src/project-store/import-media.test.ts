import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { importDroppedMediaFiles, resolveUniqueFilename } from './import-media'

class FakeWritable {
  public written: Blob | null = null
  async write(data: Blob) { this.written = data }
  async close() {}
}

class FakeFileHandle {
  public writable = new FakeWritable()
  async createWritable() { return this.writable }
}

class FakeDirHandle {
  public files = new Map<string, FakeFileHandle>()

  async getFileHandle(name: string, opts?: { create?: boolean }) {
    if (!this.files.has(name) && opts?.create) {
      this.files.set(name, new FakeFileHandle())
    }
    const handle = this.files.get(name)
    if (!handle) throw new Error(`File not found: ${name}`)
    return handle
  }
}

beforeEach(() => {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('resolveUniqueFilename', () => {
  it('returns the desired filename when it is unused', () => {
    const existing = new Set(['other.jpg'])
    expect(resolveUniqueFilename(existing, 'photo.jpg')).toBe('photo.jpg')
  })

  it('suffixes duplicate filenames before the extension', () => {
    const existing = new Set(['photo.jpg'])
    expect(resolveUniqueFilename(existing, 'photo.jpg')).toBe('photo-1.jpg')
  })

  it('increments the suffix until the filename is free', () => {
    const existing = new Set(['photo.jpg', 'photo-1.jpg', 'photo-2.jpg'])
    expect(resolveUniqueFilename(existing, 'photo.jpg')).toBe('photo-3.jpg')
  })
})

describe('importDroppedMediaFiles', () => {
  it('copies supported media into the folder and returns slides for them', async () => {
    const dir = new FakeDirHandle()
    const file = new File(['image'], 'sunset.jpg', { type: 'image/jpeg' })

    const result = await importDroppedMediaFiles(dir, [file], new Set())

    expect(result.skipped).toEqual([])
    expect(result.imported).toHaveLength(1)
    expect(result.imported[0]?.filename).toBe('sunset.jpg')
    expect(dir.files.has('sunset.jpg')).toBe(true)
    expect(dir.files.get('sunset.jpg')!.writable.written).toBeInstanceOf(Blob)
  })

  it('saves duplicate names under a suffixed filename', async () => {
    const dir = new FakeDirHandle()
    dir.files.set('photo.jpg', new FakeFileHandle())
    const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' })

    const result = await importDroppedMediaFiles(dir, [file], new Set(['photo.jpg']))

    expect(result.imported).toHaveLength(1)
    expect(result.imported[0]?.filename).toBe('photo-1.jpg')
    expect(dir.files.has('photo-1.jpg')).toBe(true)
    expect(dir.files.has('photo.jpg')).toBe(true)
  })

  it('skips unsupported types without writing partial files', async () => {
    const dir = new FakeDirHandle()
    const supported = new File(['image'], 'good.jpg', { type: 'image/jpeg' })
    const unsupported = new File(['text'], 'notes.txt', { type: 'text/plain' })

    const result = await importDroppedMediaFiles(dir, [unsupported, supported], new Set())

    expect(result.imported).toHaveLength(1)
    expect(result.imported[0]?.filename).toBe('good.jpg')
    expect(result.skipped).toEqual([{ filename: 'notes.txt', reason: 'unsupported-type' }])
    expect(dir.files.has('good.jpg')).toBe(true)
    expect(dir.files.has('notes.txt')).toBe(false)
  })
})
