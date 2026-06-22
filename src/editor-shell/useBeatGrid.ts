import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AudioClip } from '../timeline-core/types'
import type { AudioTrack } from '../project-store'
import {
  decodeMono,
  detectBeatGrid,
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
}

export function useBeatGrid({
  audioClips,
  audioTracks,
  onPersistChange,
  persisted,
}: Options) {
  const [analysisFailedForFilename, setAnalysisFailedForFilename] = useState<string | null>(null)

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

  const pendingFilenames = useMemo(
    () => audioClips
      .map((clip) => clip.filename)
      .filter((filename) => (
        !persisted.manualBeatGrid && !persisted.beatGridCache?.[filename]
      )),
    [audioClips, persisted.beatGridCache, persisted.manualBeatGrid],
  )

  const analysisStatus = useMemo((): BeatGridAnalysisStatus => {
    if (audioClips.length === 0) return 'idle'
    if (persisted.manualBeatGrid) return 'ready'
    if (pendingFilenames.length === 0) return 'ready'
    if (analysisFailedForFilename && pendingFilenames.includes(analysisFailedForFilename)) {
      return 'error'
    }
    return 'analyzing'
  }, [
    analysisFailedForFilename,
    audioClips.length,
    pendingFilenames,
    persisted.manualBeatGrid,
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
    if (persisted.manualBeatGrid || pendingFilenames.length === 0) {
      return
    }

    let cancelled = false

    async function analyzePending() {
      const nextCache: BeatGridCache = { ...persisted.beatGridCache }

      for (const filename of pendingFilenames) {
        const track = audioTracks.find((entry) => entry.filename === filename)
        if (!track) continue

        try {
          const response = await fetch(track.blobUrl)
          const buffer = await response.arrayBuffer()
          const { sampleRate, samples } = await decodeMono(buffer)
          const grid = detectBeatGrid(samples, sampleRate)
          if (cancelled) return
          nextCache[filename] = grid
        } catch {
          if (cancelled) return
          setAnalysisFailedForFilename(filename)
          return
        }
      }

      if (!cancelled) {
        onPersistChange({ beatGridCache: nextCache })
      }
    }

    void analyzePending()
    return () => { cancelled = true }
  }, [
    audioTracks,
    onPersistChange,
    pendingFilenames,
    persisted.beatGridCache,
    persisted.manualBeatGrid,
  ])

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
