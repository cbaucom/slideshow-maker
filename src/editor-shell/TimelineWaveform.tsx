import { useMemo } from 'react'
import type { WaveformPeakPair } from '../audio-analysis'
import { buildSymmetricWaveformPath } from '../audio-analysis/waveformPeaks'

type Props = {
  height: number
  peaks: WaveformPeakPair[] | undefined
  width: number
}

export function TimelineWaveform({ height, peaks, width }: Props) {
  const path = useMemo(() => {
    if (!peaks || peaks.length === 0 || width <= 0 || height <= 0) return ''
    return buildSymmetricWaveformPath(peaks, width, height)
  }, [height, peaks, width])

  if (!path) {
    return <div className="h-full w-full animate-pulse bg-emerald-900/40" />
  }

  return (
    <svg
      aria-hidden
      className="block h-full w-full"
      preserveAspectRatio="none"
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={path}
        fill="#f0c040"
        fillOpacity={0.95}
        stroke="#ffe082"
        strokeOpacity={0.35}
        strokeWidth={0.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
