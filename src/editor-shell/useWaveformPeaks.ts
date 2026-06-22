import { useEffect, useMemo, useState } from 'react'
import type { AudioClip } from '../timeline-core/types'
import type { AudioTrack } from '../project-store'
import { decodeMono } from '../beat-grid'
import { computeWaveformPeakPairs, type WaveformPeakPair } from '../audio-analysis'

type WaveformCache = Record<string, WaveformPeakPair[]>

type Options = {
  audioClips: AudioClip[]
  audioTracks: AudioTrack[]
}

function tracksForClips(audioClips: AudioClip[], audioTracks: AudioTrack[]): AudioTrack[] {
  return audioClips
    .map((clip) => audioTracks.find((track) => track.filename === clip.filename))
    .filter((track): track is AudioTrack => track !== undefined)
}

export function useWaveformPeaks({ audioClips, audioTracks }: Options) {
  const [waveformCache, setWaveformCache] = useState<WaveformCache>({})

  const playlistTracks = useMemo(
    () => tracksForClips(audioClips, audioTracks),
    [audioClips, audioTracks],
  )

  const pendingFilenames = useMemo(
    () => playlistTracks
      .map((track) => track.filename)
      .filter((filename) => waveformCache[filename] === undefined),
    [playlistTracks, waveformCache],
  )

  useEffect(() => {
    if (pendingFilenames.length === 0) return

    let cancelled = false

    async function decodePeaks() {
      const updates: WaveformCache = {}

      for (const filename of pendingFilenames) {
        if (cancelled) return

        const track = playlistTracks.find((entry) => entry.filename === filename)
        if (!track) continue

        try {
          const response = await fetch(track.blobUrl)
          const buffer = await response.arrayBuffer()
          const { samples } = await decodeMono(buffer)
          if (cancelled) return
          updates[filename] = computeWaveformPeakPairs(samples)
        } catch {
          if (cancelled) return
          updates[filename] = []
        }
      }

      if (cancelled || Object.keys(updates).length === 0) return
      setWaveformCache((previous) => ({ ...previous, ...updates }))
    }

    const deferId = window.setTimeout(() => { void decodePeaks() }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(deferId)
    }
  }, [pendingFilenames, playlistTracks])

  return { waveformCache }
}
