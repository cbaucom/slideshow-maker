import { useEffect, useMemo } from 'react'
import type { AudioClip } from '../timeline-core/types'
import type { AudioTrack } from '../project-store'
import { decodeMono, detectBeatGrid } from '../beat-grid'
import type { BeatGrid, BeatGridCache } from '../beat-grid/types'
import { recommendedGainDb } from '../audio-analysis'
import { isLoudnessCacheEntryValid } from '../audio-analysis/gain'
import type { LoudnessCache } from '../audio-analysis/types'

type Options = {
  audioClips: AudioClip[]
  audioTracks: AudioTrack[]
  beatGridCache: BeatGridCache | undefined
  loudnessCache: LoudnessCache | undefined
  manualBeatGrid: BeatGrid | undefined
  onBeatGridCacheChange: (entry: BeatGridCache) => void
  onLoudnessCacheChange: (entry: LoudnessCache) => void
}

function tracksForClips(audioClips: AudioClip[], audioTracks: AudioTrack[]): AudioTrack[] {
  const filenames = new Set(audioClips.map((clip) => clip.filename))
  return audioTracks.filter((track) => filenames.has(track.filename))
}

export function useAudioClipAnalysis({
  audioClips,
  audioTracks,
  beatGridCache,
  loudnessCache,
  manualBeatGrid,
  onBeatGridCacheChange,
  onLoudnessCacheChange,
}: Options) {
  const playlistTracks = useMemo(
    () => tracksForClips(audioClips, audioTracks),
    [audioClips, audioTracks],
  )

  const pendingBeatFilenames = useMemo(
    () => audioClips
      .map((clip) => clip.filename)
      .filter((filename) => !manualBeatGrid && !beatGridCache?.[filename]),
    [audioClips, beatGridCache, manualBeatGrid],
  )

  const pendingAnalysisFilenames = useMemo(() => {
    return playlistTracks
      .map((track) => track.filename)
      .filter((filename) => {
        const track = playlistTracks.find((entry) => entry.filename === filename)
        if (!track) return false
        const needsBeat = !manualBeatGrid && !beatGridCache?.[filename]
        const needsLoudness = !isLoudnessCacheEntryValid(
          loudnessCache?.[filename],
          track.byteLength,
        )
        return needsBeat || needsLoudness
      })
  }, [beatGridCache, loudnessCache, manualBeatGrid, playlistTracks])

  useEffect(() => {
    if (pendingAnalysisFilenames.length === 0) return

    let cancelled = false

    async function analyzePending() {
      const beatUpdates: BeatGridCache = {}
      const loudnessUpdates: LoudnessCache = {}

      for (const filename of pendingAnalysisFilenames) {
        if (cancelled) return

        const track = playlistTracks.find((entry) => entry.filename === filename)
        if (!track) continue

        const needsBeat = !manualBeatGrid && !beatGridCache?.[filename]
        const needsLoudness = !isLoudnessCacheEntryValid(
          loudnessCache?.[filename],
          track.byteLength,
        )
        if (!needsBeat && !needsLoudness) continue

        try {
          const response = await fetch(track.blobUrl)
          const buffer = await response.arrayBuffer()
          const { sampleRate, samples } = await decodeMono(buffer)
          if (cancelled) return

          const maxSamples = sampleRate * 30
          const analysisSamples = samples.length > maxSamples
            ? samples.subarray(0, maxSamples)
            : samples

          if (needsBeat) {
            beatUpdates[filename] = detectBeatGrid(samples, sampleRate)
          }
          if (needsLoudness) {
            loudnessUpdates[filename] = {
              byteLength: track.byteLength,
              offsetDb: recommendedGainDb(analysisSamples),
            }
          }
        } catch {
          if (cancelled) return
        }
      }

      if (cancelled) return
      if (Object.keys(beatUpdates).length > 0) {
        onBeatGridCacheChange(beatUpdates)
      }
      if (Object.keys(loudnessUpdates).length > 0) {
        onLoudnessCacheChange(loudnessUpdates)
      }
    }

    const deferId = window.setTimeout(() => { void analyzePending() }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(deferId)
    }
    // pendingAnalysisFilenames already reflects cache state; omit caches to avoid cancel/restart per file
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [
    manualBeatGrid,
    onBeatGridCacheChange,
    onLoudnessCacheChange,
    pendingAnalysisFilenames,
    playlistTracks,
  ])

  return { pendingBeatFilenames }
}
