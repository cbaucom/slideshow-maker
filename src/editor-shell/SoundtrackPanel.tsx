import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AudioTrack } from '../project-store'
import type { AudioClip } from '../timeline-core/types'
import { addAudioClip } from '../timeline-core'
import type { BeatGrid } from '../beat-grid/types'
import { BeatGridPanel } from './BeatGridPanel'
import type { BeatGridAnalysisStatus } from './useBeatGrid'

const NONE_VALUE = '__none__'

type Props = {
  analysisStatus: BeatGridAnalysisStatus
  audioClips: AudioClip[]
  audioTracks: AudioTrack[]
  beatSync: boolean
  effectiveBeatGrid: BeatGrid | undefined
  manualBeatGrid: BeatGrid | undefined
  onApplyManualBpm: (bpm: number, firstBeatOffsetSecs: number) => void
  onApplyTapTimestamps: (tapTimestampsMs: number[]) => void
  onChange: (clips: AudioClip[]) => void
  onClearManualBeatGrid: () => void
}

export function SoundtrackPanel({
  analysisStatus,
  audioClips,
  audioTracks,
  beatSync,
  effectiveBeatGrid,
  manualBeatGrid,
  onApplyManualBpm,
  onApplyTapTimestamps,
  onChange,
  onClearManualBeatGrid,
}: Props) {
  if (audioTracks.length === 0) return null

  const clipFilenames = new Set(audioClips.map((clip) => clip.filename))
  const availableTracks = audioTracks.filter((track) => !clipFilenames.has(track.filename))
  const primaryTrack = audioClips[0]
    ? audioTracks.find((track) => track.filename === audioClips[0].filename)
    : undefined

  return (
    <div className="flex flex-col gap-3">
      {audioClips.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {audioClips.length} clip{audioClips.length !== 1 ? 's' : ''} on timeline — reorder and adjust gain in the panel below the player.
        </p>
      ) : null}

      {availableTracks.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground" htmlFor="audio-clip-add">Add track</Label>
          <Select
            onValueChange={(value) => {
              if (value !== NONE_VALUE) {
                onChange(addAudioClip(audioClips, value))
              }
            }}
            value={NONE_VALUE}
          >
            <SelectTrigger className="w-full" id="audio-clip-add" size="sm">
              <SelectValue placeholder="Choose a track…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>Choose a track…</SelectItem>
              {availableTracks.map((track) => (
                <SelectItem key={track.filename} value={track.filename}>
                  {track.filename}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : audioClips.length === 0 ? (
        <p className="text-xs text-muted-foreground">Drop audio into the project folder, then add it here or on the timeline.</p>
      ) : null}

      {primaryTrack ? (
        <BeatGridPanel
          analysisStatus={analysisStatus}
          beatSync={beatSync}
          effectiveBeatGrid={effectiveBeatGrid}
          manualBeatGrid={manualBeatGrid}
          onApplyManualBpm={onApplyManualBpm}
          onApplyTapTimestamps={onApplyTapTimestamps}
          onClearManualBeatGrid={onClearManualBeatGrid}
          soundtrackBlobUrl={primaryTrack.blobUrl}
        />
      ) : null}
    </div>
  )
}
