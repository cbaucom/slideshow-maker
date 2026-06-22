import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { BeatGrid } from '../beat-grid/types'
import type { BeatGridAnalysisStatus } from './useBeatGrid'

const MIN_TAP_COUNT = 8

type ManualBpmFieldsProps = {
  defaultBpm?: number
  defaultOffsetSecs?: number
  manualBeatGrid: BeatGrid | undefined
  onApplyManualBpm: (bpm: number, firstBeatOffsetSecs: number) => void
  onClearManualBeatGrid: () => void
}

function ManualBpmFields({
  defaultBpm,
  defaultOffsetSecs = 0,
  manualBeatGrid,
  onApplyManualBpm,
  onClearManualBeatGrid,
}: ManualBpmFieldsProps) {
  const [bpmInput, setBpmInput] = useState(defaultBpm ? String(Math.round(defaultBpm)) : '')
  const [offsetInput, setOffsetInput] = useState(String(Number(defaultOffsetSecs.toFixed(2))))

  function handleApplyManualBpm() {
    const bpm = parseFloat(bpmInput)
    const offset = parseFloat(offsetInput)
    if (Number.isNaN(bpm) || bpm <= 0) return
    if (Number.isNaN(offset) || offset < 0) return
    onApplyManualBpm(bpm, offset)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">Manual BPM</Label>
      <div className="flex items-center gap-2">
        <Input
          aria-label="BPM"
          className="h-7 w-16 text-right"
          inputMode="decimal"
          min={1}
          onChange={(event) => setBpmInput(event.target.value)}
          placeholder="120"
          type="number"
          value={bpmInput}
        />
        <Input
          aria-label="First beat offset in seconds"
          className="h-7 w-16 text-right"
          inputMode="decimal"
          min={0}
          onChange={(event) => setOffsetInput(event.target.value)}
          placeholder="0"
          step={0.01}
          type="number"
          value={offsetInput}
        />
        <span className="text-xs text-muted-foreground">s offset</span>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={handleApplyManualBpm} size="sm" variant="outline">
          Apply
        </Button>
        {manualBeatGrid ? (
          <Button onClick={onClearManualBeatGrid} size="sm" variant="outline">
            Use detected
          </Button>
        ) : null}
      </div>
    </div>
  )
}

type Props = {
  analysisStatus: BeatGridAnalysisStatus
  beatSync: boolean
  effectiveBeatGrid: BeatGrid | undefined
  manualBeatGrid: BeatGrid | undefined
  onApplyManualBpm: (bpm: number, firstBeatOffsetSecs: number) => void
  onApplyTapTimestamps: (tapTimestampsMs: number[]) => void
  onClearManualBeatGrid: () => void
  soundtrackBlobUrl: string
}

function formatStatus(
  analysisStatus: BeatGridAnalysisStatus,
  beatSync: boolean,
  effectiveBeatGrid: BeatGrid | undefined,
  manualBeatGrid: BeatGrid | undefined,
): string {
  if (analysisStatus === 'analyzing') return 'Analyzing soundtrack…'
  if (analysisStatus === 'error') return 'Could not detect tempo'
  if (!effectiveBeatGrid) return 'No tempo detected yet'
  const bpm = `${Math.round(effectiveBeatGrid.bpm)} BPM`
  const source = manualBeatGrid ? 'manual' : 'detected'
  const sync = beatSync ? 'syncing to beat' : 'beat sync off'
  return `${bpm} · ${source} · ${sync}`
}

export function BeatGridPanel({
  analysisStatus,
  beatSync,
  effectiveBeatGrid,
  manualBeatGrid,
  onApplyManualBpm,
  onApplyTapTimestamps,
  onClearManualBeatGrid,
  soundtrackBlobUrl,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [tapCount, setTapCount] = useState(0)
  const [tapping, setTapping] = useState(false)
  const tapTimestampsRef = useRef<number[]>([])

  useEffect(() => () => {
    audioRef.current?.pause()
  }, [])

  const stopTapping = useCallback(() => {
    setTapping(false)
    audioRef.current?.pause()
    tapTimestampsRef.current = []
    setTapCount(0)
  }, [])

  const handleStartTapping = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return
    tapTimestampsRef.current = []
    setTapCount(0)
    setTapping(true)
    audio.currentTime = 0
    try {
      await audio.play()
    } catch {
      setTapping(false)
    }
  }, [])

  const handleTap = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !tapping) return
    const timestamps = [...tapTimestampsRef.current, audio.currentTime * 1000]
    tapTimestampsRef.current = timestamps
    setTapCount(timestamps.length)
    if (timestamps.length >= MIN_TAP_COUNT) {
      stopTapping()
      onApplyTapTimestamps(timestamps)
    }
  }, [onApplyTapTimestamps, stopTapping, tapping])

  const manualDefaultsKey = manualBeatGrid
    ? `manual-${manualBeatGrid.bpm}-${manualBeatGrid.firstBeatOffsetSecs}`
    : `detected-${effectiveBeatGrid?.bpm ?? 'none'}-${effectiveBeatGrid?.firstBeatOffsetSecs ?? 0}`

  return (
    <div className="flex flex-col gap-3 border-t pt-3">
      <p className="text-xs text-muted-foreground">
        {formatStatus(analysisStatus, beatSync, effectiveBeatGrid, manualBeatGrid)}
      </p>

      <audio preload="auto" ref={audioRef} src={soundtrackBlobUrl} />

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Tap tempo</Label>
        <div className="flex gap-2">
          {tapping ? (
            <>
              <Button className="flex-1" onClick={handleTap} size="sm">
                Tap ({tapCount}/{MIN_TAP_COUNT})
              </Button>
              <Button onClick={stopTapping} size="sm" variant="outline">Cancel</Button>
            </>
          ) : (
            <Button className="w-full" onClick={handleStartTapping} size="sm" variant="outline">
              Tap along to the beat
            </Button>
          )}
        </div>
      </div>

      <ManualBpmFields
        defaultBpm={manualBeatGrid?.bpm ?? effectiveBeatGrid?.bpm}
        defaultOffsetSecs={manualBeatGrid?.firstBeatOffsetSecs ?? effectiveBeatGrid?.firstBeatOffsetSecs}
        key={manualDefaultsKey}
        manualBeatGrid={manualBeatGrid}
        onApplyManualBpm={onApplyManualBpm}
        onClearManualBeatGrid={onClearManualBeatGrid}
      />
    </div>
  )
}
