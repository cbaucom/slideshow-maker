import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AudioTrack } from '../project-store'
import type { BeatGrid } from '../beat-grid/types'
import { BeatGridPanel } from './BeatGridPanel'
import type { BeatGridAnalysisStatus } from './useBeatGrid'

const NONE_VALUE = '__none__'

type Props = {
  analysisStatus: BeatGridAnalysisStatus
  audioTracks: AudioTrack[]
  beatSync: boolean
  effectiveBeatGrid: BeatGrid | undefined
  manualBeatGrid: BeatGrid | undefined
  onApplyManualBpm: (bpm: number, firstBeatOffsetSecs: number) => void
  onApplyTapTimestamps: (tapTimestampsMs: number[]) => void
  onChange: (filename: string | null) => void
  onClearManualBeatGrid: () => void
  soundtrackFilename: string | null
}

export function SoundtrackPanel({
  analysisStatus,
  audioTracks,
  beatSync,
  effectiveBeatGrid,
  manualBeatGrid,
  onApplyManualBpm,
  onApplyTapTimestamps,
  onChange,
  onClearManualBeatGrid,
  soundtrackFilename,
}: Props) {
  if (audioTracks.length === 0) return null

  const selectedTrack = soundtrackFilename
    ? audioTracks.find((track) => track.filename === soundtrackFilename)
    : undefined

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground" htmlFor="soundtrack-select">Track</Label>
        <Select
          onValueChange={(value) => onChange(value === NONE_VALUE ? null : value)}
          value={soundtrackFilename ?? NONE_VALUE}
        >
          <SelectTrigger className="w-full" id="soundtrack-select" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>None</SelectItem>
            {audioTracks.map((track) => (
              <SelectItem key={track.filename} value={track.filename}>
                {track.filename}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTrack ? (
        <BeatGridPanel
          analysisStatus={analysisStatus}
          beatSync={beatSync}
          effectiveBeatGrid={effectiveBeatGrid}
          manualBeatGrid={manualBeatGrid}
          onApplyManualBpm={onApplyManualBpm}
          onApplyTapTimestamps={onApplyTapTimestamps}
          onClearManualBeatGrid={onClearManualBeatGrid}
          soundtrackBlobUrl={selectedTrack.blobUrl}
        />
      ) : null}
    </div>
  )
}
