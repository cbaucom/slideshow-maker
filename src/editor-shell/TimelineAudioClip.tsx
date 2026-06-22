import { type MutableRefObject } from 'react'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type { WaveformPeakPair } from '../audio-analysis'
import type { TimelineAudioBlock } from '../sequence-planner'
import { TimelineWaveform } from './TimelineWaveform'

const GAIN_SLIDER_MAX_DB = 12
const GAIN_SLIDER_MIN_DB = -12
const GAIN_SLIDER_STEP_DB = 0.5
const WAVEFORM_HEIGHT_PX = 52

type Props = {
  autoGainDb: number | undefined
  clipIndex: number
  dragIndexRef: MutableRefObject<number | null>
  manualGainDb: number | undefined
  onGainChange: (clipIndex: number, gainDb: number | undefined) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onRemove: (clipIndex: number) => void
  peaks: WaveformPeakPair[] | undefined
  segment: TimelineAudioBlock
}

export function TimelineAudioClip({
  autoGainDb,
  clipIndex,
  dragIndexRef,
  manualGainDb,
  onGainChange,
  onReorder,
  onRemove,
  peaks,
  segment,
}: Props) {
  const displayGainDb = manualGainDb ?? autoGainDb ?? 0
  const clipWidthPx = Math.max(1, Math.floor(segment.widthPx - 2))

  return (
    <div
      className="absolute top-1 bottom-1 flex cursor-grab flex-col overflow-hidden rounded-sm border border-emerald-600/50 bg-[#1f4d2a] active:cursor-grabbing"
      data-timeline-block=""
      draggable
      onDragEnd={() => { dragIndexRef.current = null }}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={() => { dragIndexRef.current = clipIndex }}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (dragIndexRef.current !== null && dragIndexRef.current !== clipIndex) {
          onReorder(dragIndexRef.current, clipIndex)
        }
        dragIndexRef.current = null
      }}
      style={{ left: segment.leftPx, width: segment.widthPx }}
    >
      <div
        className="relative min-h-0 flex-1 overflow-hidden border-b border-emerald-700/50 bg-[#2a5c34]"
        style={{ height: WAVEFORM_HEIGHT_PX }}
      >
        <TimelineWaveform
          height={WAVEFORM_HEIGHT_PX}
          peaks={peaks}
          width={clipWidthPx}
        />
      </div>
      <div className="flex shrink-0 items-center gap-1 px-1 py-0.5">
        <span className="min-w-0 flex-1 truncate text-[10px] text-emerald-50">{segment.filename}</span>
        <span className={cn(
          'shrink-0 text-[10px] tabular-nums',
          manualGainDb !== undefined ? 'text-amber-300' : 'text-emerald-100/80',
        )}
        >
          {displayGainDb.toFixed(1)} dB
        </span>
        <button
          aria-label={`Remove ${segment.filename}`}
          className="shrink-0 text-[10px] text-emerald-100/80 hover:text-white"
          onClick={() => onRemove(clipIndex)}
          type="button"
        >
          ×
        </button>
      </div>
      <div className="shrink-0 px-1 pb-1">
        <Slider
          aria-label={`Gain for ${segment.filename}`}
          max={GAIN_SLIDER_MAX_DB}
          min={GAIN_SLIDER_MIN_DB}
          onValueChange={(values) => {
            const nextGainDb = values[0]
            if (nextGainDb === undefined) return
            if (autoGainDb !== undefined && Math.abs(nextGainDb - autoGainDb) < 0.01) {
              onGainChange(clipIndex, undefined)
              return
            }
            onGainChange(clipIndex, nextGainDb)
          }}
          step={GAIN_SLIDER_STEP_DB}
          value={[manualGainDb ?? autoGainDb ?? 0]}
        />
      </div>
    </div>
  )
}
