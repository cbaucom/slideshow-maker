import { cn } from '@/lib/utils'
import type { WaveformPeakPair } from '../audio-analysis'
import type { TimelineAudioBlock } from '../sequence-planner'
import { TimelineWaveform } from './TimelineWaveform'

const WAVEFORM_HEIGHT_PX = 56

type Props = {
  autoGainDb: number | undefined
  clipIndex: number
  manualGainDb: number | undefined
  peaks: WaveformPeakPair[] | undefined
  segment: TimelineAudioBlock
}

export function TimelineAudioClip({
  autoGainDb,
  clipIndex,
  manualGainDb,
  peaks,
  segment,
}: Props) {
  const displayGainDb = manualGainDb ?? autoGainDb ?? 0
  const clipWidthPx = Math.max(1, Math.floor(segment.widthPx - 2))

  return (
    <div
      className={cn(
        'absolute top-0 bottom-0 flex flex-col overflow-hidden border-y border-emerald-600/50 bg-[#1f4d2a]',
        clipIndex > 0 && 'border-l-2 border-l-amber-300/90',
        clipIndex === 0 && 'border-l border-l-emerald-600/50',
        'border-r border-r-emerald-600/50',
      )}
      data-timeline-block=""
      style={{ left: segment.leftPx, width: segment.widthPx }}
    >
      <div
        className="relative min-h-0 flex-1 overflow-hidden bg-[#2a5c34]"
        style={{ height: WAVEFORM_HEIGHT_PX }}
      >
        <TimelineWaveform
          height={WAVEFORM_HEIGHT_PX}
          peaks={peaks}
          width={clipWidthPx}
        />
        <span className="pointer-events-none absolute top-1 left-1 rounded-sm bg-black/50 px-1 text-[10px] tabular-nums text-amber-200">
          {clipIndex + 1}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1 border-t border-emerald-700/50 px-1 py-0.5">
        <span className="min-w-0 flex-1 truncate text-[10px] text-emerald-50">{segment.filename}</span>
        <span className={cn(
          'shrink-0 text-[10px] tabular-nums',
          manualGainDb !== undefined ? 'text-amber-300' : 'text-emerald-100/80',
        )}
        >
          {displayGainDb.toFixed(1)} dB
        </span>
      </div>
    </div>
  )
}
