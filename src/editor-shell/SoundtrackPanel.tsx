import type { AudioTrack } from '../project-store'

type Props = {
  audioTracks: AudioTrack[]
  onChange: (filename: string | null) => void
  soundtrackFilename: string | null
}

export function SoundtrackPanel({ audioTracks, onChange, soundtrackFilename }: Props) {
  if (audioTracks.length === 0) return null

  return (
    <div className="settings-panel soundtrack-panel">
      <h2 className="settings-title">Soundtrack</h2>
      <label className="settings-row">
        <span className="settings-label">Track</span>
        <select
          className="settings-select"
          value={soundtrackFilename ?? ''}
          onChange={(event) => {
            const value = event.target.value
            onChange(value ? value : null)
          }}
        >
          <option value="">None</option>
          {audioTracks.map((track) => (
            <option key={track.filename} value={track.filename}>
              {track.filename}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
