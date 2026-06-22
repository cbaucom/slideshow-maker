import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AudioTrack } from '../project-store'
import {
  decodeMono,
  detectBeatGrid,
  manualBeatGridFromBpm,
  resolveEffectiveBeatGrid,
  tapToBpm,
  type BeatGrid,
} from '../beat-grid'

export type BeatGridAnalysisStatus = 'analyzing' | 'error' | 'idle' | 'ready'

type PersistedBeatGrid = {
  beatGridCache?: BeatGrid
  manualBeatGrid?: BeatGrid
}

type Options = {
  audioTracks: AudioTrack[]
  onPersistChange: (update: PersistedBeatGrid) => void
  persisted: PersistedBeatGrid
  soundtrackFilename: string | null
}

export function useBeatGrid({
  audioTracks,
  onPersistChange,
  persisted,
  soundtrackFilename,
}: Options) {
  const [analysisFailedForFilename, setAnalysisFailedForFilename] = useState<string | null>(null)

  const soundtrack = soundtrackFilename
    ? audioTracks.find((track) => track.filename === soundtrackFilename)
    : undefined

  const effectiveBeatGrid = resolveEffectiveBeatGrid(
    persisted.manualBeatGrid,
    persisted.beatGridCache,
  )

  const analysisStatus = useMemo((): BeatGridAnalysisStatus => {
    if (!soundtrack) return 'idle'
    if (persisted.manualBeatGrid || persisted.beatGridCache) return 'ready'
    if (analysisFailedForFilename === soundtrack.filename) return 'error'
    return 'analyzing'
  }, [
    analysisFailedForFilename,
    persisted.beatGridCache,
    persisted.manualBeatGrid,
    soundtrack,
  ])

  const setManualBeatGrid = useCallback((grid: BeatGrid | undefined) => {
    onPersistChange({ manualBeatGrid: grid })
    setAnalysisFailedForFilename(null)
  }, [onPersistChange])

  const clearManualBeatGrid = useCallback(() => {
    onPersistChange({ manualBeatGrid: undefined })
  }, [onPersistChange])

  const applyManualBpm = useCallback((bpm: number, firstBeatOffsetSecs: number) => {
    setManualBeatGrid(manualBeatGridFromBpm(bpm, firstBeatOffsetSecs))
  }, [setManualBeatGrid])

  const applyTapTimestamps = useCallback((tapTimestampsMs: number[]) => {
    setManualBeatGrid(tapToBpm(tapTimestampsMs))
  }, [setManualBeatGrid])

  useEffect(() => {
    if (!soundtrack || persisted.manualBeatGrid || persisted.beatGridCache) {
      return
    }

    let cancelled = false

    async function analyze() {
      try {
        const response = await fetch(soundtrack!.blobUrl)
        const buffer = await response.arrayBuffer()
        const { sampleRate, samples } = await decodeMono(buffer)
        const grid = detectBeatGrid(samples, sampleRate)
        if (cancelled) return
        onPersistChange({ beatGridCache: grid })
      } catch {
        if (cancelled) return
        setAnalysisFailedForFilename(soundtrack!.filename)
      }
    }

    void analyze()
    return () => { cancelled = true }
  }, [
    onPersistChange,
    persisted.beatGridCache,
    persisted.manualBeatGrid,
    soundtrack,
  ])

  return {
    analysisStatus,
    applyManualBpm,
    applyTapTimestamps,
    clearManualBeatGrid,
    effectiveBeatGrid,
    setManualBeatGrid,
    soundtrack,
  }
}
