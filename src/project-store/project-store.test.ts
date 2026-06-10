import { describe, it, expect } from 'vitest'
import { createFreshProject, openProject, saveProject } from './project-store'
import { SCHEMA_VERSION } from './schema'

// --- In-memory FS fakes ---

class FakeWritable {
  public written = ''
  async write(data: string) { this.written = data }
  async close() {}
}

class FakeFileHandle {
  public name: string
  private _content: string | null
  private _writable: FakeWritable

  constructor(name: string, content: string | null = null) {
    this.name = name
    this._content = content
    this._writable = new FakeWritable()
  }

  async getFile(): Promise<{ text(): Promise<string> }> {
    if (this._content === null) throw new DOMException('File not found', 'NotFoundError')
    const c = this._content
    return { text: async () => c }
  }

  async createWritable(): Promise<FakeWritable> {
    this._writable = new FakeWritable()
    return this._writable
  }

  getLastWritten(): string { return this._writable.written }
  setContent(c: string) { this._content = c }
}

class FakeDirHandle {
  private _files = new Map<string, FakeFileHandle>()

  addFile(name: string, content: string) {
    this._files.set(name, new FakeFileHandle(name, content))
  }

  async getFileHandle(name: string, opts?: { create?: boolean }): Promise<FakeFileHandle> {
    let fh = this._files.get(name)
    if (!fh) {
      if (opts?.create) {
        fh = new FakeFileHandle(name, null)
        this._files.set(name, fh)
        return fh
      }
      throw new DOMException('File not found', 'NotFoundError')
    }
    return fh
  }

  getFile(name: string): FakeFileHandle | undefined { return this._files.get(name) }
}

// --- Tests ---

describe('createFreshProject', () => {
  it('returns schema-versioned empty project', () => {
    const p = createFreshProject()
    expect(p.schemaVersion).toBe(SCHEMA_VERSION)
    expect(p.slides).toEqual([])
  })
})

describe('openProject', () => {
  it('returns fresh project when no slideshow.json exists', async () => {
    const dir = new FakeDirHandle()
    const result = await openProject(dir)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.data.slides).toEqual([])
      expect(result.data.schemaVersion).toBe(SCHEMA_VERSION)
    }
  })

  it('restores state from existing slideshow.json', async () => {
    const dir = new FakeDirHandle()
    const saved = {
      schemaVersion: SCHEMA_VERSION,
      slides: [{ id: 'a-1', filename: 'a.jpg', type: 'image', durationInFrames: 90 }],
    }
    dir.addFile('slideshow.json', JSON.stringify(saved))

    const result = await openProject(dir)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.data.slides).toHaveLength(1)
      expect(result.data.slides[0].filename).toBe('a.jpg')
    }
  })

  it('returns corrupt status for invalid JSON', async () => {
    const dir = new FakeDirHandle()
    dir.addFile('slideshow.json', 'not valid json{{{')

    const result = await openProject(dir)
    expect(result.status).toBe('corrupt')
    if (result.status === 'corrupt') {
      expect(typeof result.error).toBe('string')
      expect(result.error.length).toBeGreaterThan(0)
    }
  })

  it('returns corrupt status for JSON missing required fields', async () => {
    const dir = new FakeDirHandle()
    dir.addFile('slideshow.json', JSON.stringify({ foo: 'bar' }))

    const result = await openProject(dir)
    expect(result.status).toBe('corrupt')
  })
})

describe('saveProject', () => {
  it('writes slideshow.json with the given data', async () => {
    const dir = new FakeDirHandle()
    const data = { schemaVersion: SCHEMA_VERSION, slides: [] }

    await saveProject(dir, data)

    const fh = dir.getFile('slideshow.json')
    expect(fh).toBeDefined()
    const written = JSON.parse(fh!.getLastWritten())
    expect(written.schemaVersion).toBe(SCHEMA_VERSION)
    expect(written.slides).toEqual([])
  })

  it('round-trips data through save then open', async () => {
    const dir = new FakeDirHandle()
    const slide = { id: 'x-1', filename: 'x.jpg', type: 'image' as const, durationInFrames: 90 }
    const data = { schemaVersion: SCHEMA_VERSION, slides: [slide] }

    await saveProject(dir, data)
    // Simulate what open does: read the written content back
    const fh = dir.getFile('slideshow.json')!
    fh.setContent(fh.getLastWritten())

    const result = await openProject(dir)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.data.slides[0].filename).toBe('x.jpg')
    }
  })
})
