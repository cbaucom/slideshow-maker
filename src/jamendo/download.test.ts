import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadTrack, sanitizeFilename } from './download'

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
  public createdFiles = new Map<string, FakeFileHandle>()
  async getFileHandle(name: string, opts?: { create?: boolean }) {
    if (!this.createdFiles.has(name) && opts?.create) {
      this.createdFiles.set(name, new FakeFileHandle())
    }
    const fh = this.createdFiles.get(name)
    if (!fh) throw new Error(`File not found: ${name}`)
    return fh
  }
}

afterEach(() => vi.restoreAllMocks())

describe('downloadTrack', () => {
  it('fetches the audio URL and writes a Blob to the folder', async () => {
    const fakeBlob = new Blob(['fake audio'], { type: 'audio/mpeg' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => fakeBlob,
    }))

    const dir = new FakeDirHandle()
    await downloadTrack('https://example.com/track.mp3', 'Artist - Track.mp3', dir)

    expect(dir.createdFiles.has('Artist - Track.mp3')).toBe(true)
    expect(dir.createdFiles.get('Artist - Track.mp3')!.writable.written).toBe(fakeBlob)
  })

  it('throws when the download fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    const dir = new FakeDirHandle()
    await expect(downloadTrack('https://example.com/track.mp3', 'x.mp3', dir)).rejects.toThrow()
  })
})

describe('sanitizeFilename', () => {
  it('replaces path-unsafe characters with underscores', () => {
    expect(sanitizeFilename('Art/ist: Track?Name')).toBe('Art_ist_ Track_Name.mp3')
  })

  it('appends .mp3 extension if missing', () => {
    expect(sanitizeFilename('Cool Track')).toBe('Cool Track.mp3')
  })

  it('keeps .mp3 extension if already present', () => {
    expect(sanitizeFilename('Cool Track.mp3')).toBe('Cool Track.mp3')
  })
})
