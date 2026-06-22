import { useCallback, useMemo } from 'react'
import type { AudioClip } from '../timeline-core/types'
import type { AudioTrack } from '../project-store'
import {
  manualBeatGridFromBpm,
  resolveConcatenatedBeatTimes,
  resolveEffectiveBeatGrid,
  tapToBpm,
  type BeatGrid,
  type BeatGridCache,
} from '../beat-grid'
import { FPS } from './PlayerPane'

export type BeatGridAnalysisStatus = 'analyzing' | 'error' | 'idle' | 'ready'

type PersistedBeatGrid = {
  beatGridCache?: BeatGridCache
  manualBeatGrid?: BeatGrid
}

type Options = {
  audioClips: AudioClip[]
  audioTracks: AudioTrack[]
  onPersistChange: (update: PersistedBeatGrid) => void
  persisted: PersistedBeatGrid
  pendingBeatFilenames: string[]
}

export function useBeatGrid({
  audioClips,
  audioTracks,
  onPersistChange,
  persisted,
  pendingBeatFilenames,
}: Options) {
  const clipTimings = useMemo(
    () => audioClips.flatMap((clip) => {
      const track = audioTracks.find((entry) => entry.filename === clip.filename)
      if (!track) return []
      return [{ filename: clip.filename, durationInFrames: track.durationInFrames }]
    }),
    [audioClips, audioTracks],
  )

  const primaryClipFilename = audioClips[0]?.filename ?? null
  const soundtrack = primaryClipFilename
    ? audioTracks.find((track) => track.filename === primaryClipFilename)
    : undefined

  const effectiveBeatGrid = resolveEffectiveBeatGrid(
    persisted.manualBeatGrid,
    persisted.beatGridCache,
  )

  const concatenatedBeatTimes = useMemo(
    () => resolveConcatenatedBeatTimes(
      persisted.manualBeatGrid,
      persisted.beatGridCache,
      clipTimings,
      FPS,
    ),
    [clipTimings, persisted.beatGridCache, persisted.manualBeatGrid],
  )

  const analysisStatus = useMemo((): BeatGridAnalysisStatus => {
    if (audioClips.length === 0) return 'idle'
    if (persisted.manualBeatGrid) return 'ready'
    if (pendingBeatFilenames.length === 0) return 'ready'
    return 'analyzing'
  }, [audioClips.length, pendingBeatFilenames.length, persisted.manualBeatGrid])

  const setManualBeatGrid = useCallback((grid: BeatGrid | undefined) => {
    onPersistChange({ manualBeatGrid: grid })
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

  return {
    analysisStatus,
    applyManualBpm,
    applyTapTimestamps,
    clearManualBeatGrid,
    concatenatedBeatTimes,
    effectiveBeatGrid,
    setManualBeatGrid,
    soundtrack,
  }
}
