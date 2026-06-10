import { describe, it, expect, beforeEach } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import {
  addRecentProject,
  listRecentProjects,
  removeRecentProject,
} from './recent-projects'

// Each test gets a fresh isolated IDB instance.
let idb: IDBFactory
beforeEach(() => { idb = new IDBFactory() })

function fakeHandle(name: string): FileSystemDirectoryHandle {
  return { name } as unknown as FileSystemDirectoryHandle
}

describe('listRecentProjects', () => {
  it('returns empty array when no projects have been added', async () => {
    const list = await listRecentProjects(idb)
    expect(list).toEqual([])
  })
})

describe('addRecentProject + listRecentProjects', () => {
  it('added project appears in the list', async () => {
    await addRecentProject(fakeHandle('my-photos'), idb)
    const list = await listRecentProjects(idb)
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('my-photos')
  })

  it('adding the same folder name upserts (no duplicates)', async () => {
    await addRecentProject(fakeHandle('my-photos'), idb)
    await addRecentProject(fakeHandle('my-photos'), idb)
    const list = await listRecentProjects(idb)
    expect(list).toHaveLength(1)
  })

  it('lists most-recently-opened first', async () => {
    await addRecentProject(fakeHandle('older'), idb)
    await addRecentProject(fakeHandle('newer'), idb)
    const list = await listRecentProjects(idb)
    expect(list[0].name).toBe('newer')
    expect(list[1].name).toBe('older')
  })

  it('caps list at 10 entries', async () => {
    for (let i = 0; i < 12; i++) {
      await addRecentProject(fakeHandle(`folder-${i}`), idb)
    }
    const list = await listRecentProjects(idb)
    expect(list).toHaveLength(10)
  })
})

describe('removeRecentProject', () => {
  it('removed project no longer appears in list', async () => {
    await addRecentProject(fakeHandle('keep'), idb)
    await addRecentProject(fakeHandle('remove-me'), idb)
    await removeRecentProject('remove-me', idb)
    const list = await listRecentProjects(idb)
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('keep')
  })

  it('removing a non-existent entry is a no-op', async () => {
    await expect(removeRecentProject('ghost', idb)).resolves.toBeUndefined()
  })
})
