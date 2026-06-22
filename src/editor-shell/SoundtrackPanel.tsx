import { useRef } from 'react'
import { Button } from '@/components/ui/button'
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
import { addAudioClip, moveAudioClip, removeAudioClip } from '../timeline-core'
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
  const dragIndexRef = useRef<number | null>(null)

  if (audioTracks.length === 0) return null

  const clipFilenames = new Set(audioClips.map((clip) => clip.filename))
  const availableTracks = audioTracks.filter((track) => !clipFilenames.has(track.filename))
  const primaryTrack = audioClips[0]
    ? audioTracks.find((track) => track.filename === audioClips[0].filename)
    : undefined

  return (
    <div className="flex flex-col gap-3">
      {audioClips.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Playlist</Label>
          <ul className="flex flex-col gap-1">
            {audioClips.map((clip, index) => (
              <li
                key={`${clip.filename}-${index}`}
                className="flex items-center gap-1 rounded-md border bg-background px-2 py-1.5 text-xs"
                draggable
                onDragEnd={() => { dragIndexRef.current = null }}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={() => { dragIndexRef.current = index }}
                onDrop={(event) => {
                  event.preventDefault()
                  if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
                    onChange(moveAudioClip(audioClips, dragIndexRef.current, index))
                  }
                  dragIndexRef.current = null
                }}
              >
                <span className="min-w-0 flex-1 truncate">{clip.filename}</span>
                <Button
                  aria-label={`Remove ${clip.filename}`}
                  onClick={() => onChange(removeAudioClip(audioClips, index))}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  ×
                </Button>
              </li>
            ))}
          </ul>
        </div>
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
