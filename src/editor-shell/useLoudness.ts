import { useEffect } from 'react'
import { decodeMono } from '../beat-grid'
import { recommendedGainDb } from '../audio-analysis'
import type { LoudnessCache } from '../audio-analysis/types'
import { isLoudnessCacheEntryValid } from '../audio-analysis/gain'
import type { AudioTrack } from '../project-store'

type Options = {
  audioTracks: AudioTrack[]
  loudnessCache: LoudnessCache | undefined
  onPersistChange: (cache: LoudnessCache) => void
}

export function useLoudness({
  audioTracks,
  loudnessCache,
  onPersistChange,
}: Options) {
  useEffect(() => {
    const pending = audioTracks.filter((track) => {
      const cached = loudnessCache?.[track.filename]
      return !isLoudnessCacheEntryValid(cached, track.byteLength)
    })

    if (pending.length === 0) return

    let cancelled = false

    async function analyzeAll() {
      const updates: LoudnessCache = { ...loudnessCache }

      for (const track of pending) {
        try {
          const response = await fetch(track.blobUrl)
          const buffer = await response.arrayBuffer()
          const { samples } = await decodeMono(buffer)
          if (cancelled) return
          updates[track.filename] = {
            byteLength: track.byteLength,
            offsetDb: recommendedGainDb(samples),
          }
        } catch {
          if (cancelled) return
        }
      }

      if (!cancelled && Object.keys(updates).length > 0) {
        onPersistChange(updates)
      }
    }

    void analyzeAll()
    return () => { cancelled = true }
  }, [audioTracks, loudnessCache, onPersistChange])

  return { loudnessCache }
}
