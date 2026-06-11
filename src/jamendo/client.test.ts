import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchTracks } from './client'

const CLIENT_ID = 'test_client'

const TRACK_FIXTURE = {
  id: '1234',
  name: 'Cool Track',
  artist_name: 'Cool Artist',
  duration: 240,
  audio: 'https://mp3l.jamendo.com/?trackid=1234&format=mp32',
  license_ccurl: 'https://creativecommons.org/licenses/by/4.0/',
}

function mockFetch(body: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }))
}

afterEach(() => vi.restoreAllMocks())

describe('searchTracks — happy path', () => {
  it('returns parsed tracks for a successful query', async () => {
    mockFetch({
      headers: { code: 0, error_message: '' },
      results: [TRACK_FIXTURE],
    })

    const tracks = await searchTracks('jazz', CLIENT_ID)

    expect(tracks).toHaveLength(1)
    expect(tracks[0]).toEqual({
      id: '1234',
      name: 'Cool Track',
      artistName: 'Cool Artist',
      durationSecs: 240,
      audioUrl: 'https://mp3l.jamendo.com/?trackid=1234&format=mp32',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    })
  })

  it('includes client_id and search term in the request URL', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ headers: { code: 0 }, results: [] }),
    })
    vi.stubGlobal('fetch', fakeFetch)

    await searchTracks('ambient', CLIENT_ID)

    const calledUrl: string = fakeFetch.mock.calls[0][0]
    expect(calledUrl).toContain('client_id=test_client')
    expect(calledUrl).toContain('search=ambient')
  })

  it('returns empty array when results is empty', async () => {
    mockFetch({ headers: { code: 0 }, results: [] })
    const tracks = await searchTracks('xyzunknown', CLIENT_ID)
    expect(tracks).toEqual([])
  })
})

describe('searchTracks — error handling (AC3)', () => {
  it('throws a JamendoError on HTTP error', async () => {
    mockFetch({ headers: { code: 0 }, results: [] }, 500)
    await expect(searchTracks('jazz', CLIENT_ID)).rejects.toThrow()
  })

  it('throws a JamendoError when API code is non-zero', async () => {
    mockFetch({
      headers: { code: 8, error_message: 'Invalid client_id.' },
      results: [],
    })
    await expect(searchTracks('jazz', CLIENT_ID)).rejects.toThrow('Invalid client_id.')
  })

  it('throws when fetch itself rejects (network failure)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(searchTracks('jazz', CLIENT_ID)).rejects.toThrow()
  })
})
