import type { BeatGrid, BeatGridCache } from './types'
import {
  beatTimesFromGrid,
  buildConcatenatedBeatTimes,
  totalAudioDurationSecs,
  type AudioClipTiming,
} from './concat'

/**
 * Return the effective BeatGrid for planning: manual override wins over
 * auto-detected cache. Manual values persist across re-analysis until cleared.
 */
export function resolveEffectiveBeatGrid(
  manualBeatGrid: BeatGrid | undefined,
  beatGridCache: BeatGridCache | undefined,
): BeatGrid | undefined {
  if (manualBeatGrid) return manualBeatGrid
  if (!beatGridCache) return undefined
  const filenames = Object.keys(beatGridCache)
  if (filenames.length === 0) return undefined
  return beatGridCache[filenames[0]]
}

export function resolveConcatenatedBeatTimes(
  manualBeatGrid: BeatGrid | undefined,
  beatGridCache: BeatGridCache | undefined,
  clips: AudioClipTiming[],
  fps = 30,
): number[] | undefined {
  if (clips.length === 0) return undefined

  const totalSecs = totalAudioDurationSecs(clips, fps)
  if (manualBeatGrid) {
    return beatTimesFromGrid(manualBeatGrid, totalSecs)
  }

  if (!beatGridCache) return undefined
  const beatTimes = buildConcatenatedBeatTimes(clips, beatGridCache, fps)
  return beatTimes.length > 0 ? beatTimes : undefined
}
