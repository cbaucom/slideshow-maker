import type { JamendoTrack } from './types'

const JAMENDO_API = 'https://api.jamendo.com/v3.0'

export class JamendoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JamendoError'
  }
}

export async function searchTracks(query: string, clientId: string): Promise<JamendoTrack[]> {
  const url = new URL(`${JAMENDO_API}/tracks/`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '20')
  url.searchParams.set('search', query)
  url.searchParams.set('audioformat', 'mp32')

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new JamendoError(`Jamendo API request failed: ${response.status}`)
  }

  const data = await response.json() as {
    headers: { code: number; error_message?: string }
    results: Array<{
      id: string | number
      name: string
      artist_name: string
      duration: number
      audio: string
      license_ccurl: string
    }>
  }

  if (data.headers?.code !== 0) {
    throw new JamendoError(data.headers?.error_message || 'Jamendo API error')
  }

  return (data.results ?? []).map(r => ({
    id: String(r.id),
    name: r.name,
    artistName: r.artist_name,
    durationSecs: r.duration,
    audioUrl: r.audio,
    licenseUrl: r.license_ccurl,
  }))
}
