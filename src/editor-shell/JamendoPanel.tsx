import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { JamendoAttribution, JamendoTrack } from '../jamendo/types'
import { searchTracks } from '../jamendo/client'

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'results'; tracks: JamendoTrack[] }
  | { status: 'empty' }
  | { status: 'error'; message: string }

type Props = {
  clientId: string
  onAdd: (track: JamendoTrack, attribution: JamendoAttribution) => Promise<void>
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

export function JamendoPanel({ clientId, onAdd }: Props) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchState>({ status: 'idle' })
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => { audioRef.current?.pause() }
  }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setState({ status: 'loading' })
    try {
      const tracks = await searchTracks(query.trim(), clientId)
      setState(tracks.length === 0 ? { status: 'empty' } : { status: 'results', tracks })
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Search failed' })
    }
  }

  function togglePreview(track: JamendoTrack) {
    if (previewId === track.id) {
      audioRef.current?.pause()
      setPreviewId(null)
    } else {
      if (audioRef.current) {
        audioRef.current.onended = null
        audioRef.current.pause()
      }
      const audio = new Audio(track.audioUrl)
      audio.onended = () => setPreviewId(null)
      audio.play().catch(() => setPreviewId(null))
      audioRef.current = audio
      setPreviewId(track.id)
    }
  }

  async function handleAdd(track: JamendoTrack) {
    setAddingId(track.id)
    setAddError(null)
    audioRef.current?.pause()
    setPreviewId(null)
    const attribution: JamendoAttribution = {
      jamendoId: track.id,
      name: track.name,
      artist: track.artistName,
      licenseUrl: track.licenseUrl,
    }
    try {
      await onAdd(track, attribution)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add track')
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <form className="flex gap-1.5" onSubmit={handleSearch}>
        <Input
          type="text"
          className="h-7 min-w-0 flex-1"
          placeholder="Search by mood, genre, or keyword…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search Jamendo"
        />
        <Button size="sm" type="submit" disabled={state.status === 'loading'}>
          {state.status === 'loading' ? 'Searching…' : 'Search'}
        </Button>
      </form>

      {state.status === 'results' && (
        <ul
          aria-label="Search results"
          className="flex h-64 flex-col overflow-x-hidden overflow-y-auto rounded-md border"
        >
            {state.tracks.map(track => (
              <li
                key={track.id}
                className="flex items-center gap-2 border-b px-2 py-1.5 last:border-b-0"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm" title={track.name}>{track.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {track.artistName} · {formatDuration(track.durationSecs)}
                  </span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => togglePreview(track)}
                    aria-label={previewId === track.id ? `Stop preview of ${track.name}` : `Preview ${track.name}`}
                  >
                    {previewId === track.id ? 'Stop' : 'Preview'}
                  </Button>
                  <Button
                    size="xs"
                    onClick={() => handleAdd(track)}
                    disabled={addingId === track.id}
                    aria-label={`Add ${track.name} to project`}
                  >
                    {addingId === track.id ? 'Adding…' : 'Add'}
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      )}

      {addError && (
        <p className="text-xs text-destructive">{addError}</p>
      )}

      {state.status === 'empty' && (
        <p className="text-xs text-muted-foreground">
          No results found. Try different keywords, or drop an audio file into your project folder.
        </p>
      )}

      {state.status === 'error' && (
        <p className="text-xs text-destructive">
          {state.message} — or drop an audio file into your project folder instead.
        </p>
      )}
    </div>
  )
}
