import type { BeatGrid } from './types'

/**
 * Return the effective BeatGrid for planning: manual override wins over
 * auto-detected cache.  Manual values persist across re-analysis until
 * explicitly cleared (by passing undefined as manualBeatGrid).
 */
export function resolveEffectiveBeatGrid(
  manualBeatGrid: BeatGrid | undefined,
  beatGridCache: BeatGrid | undefined,
): BeatGrid | undefined {
  return manualBeatGrid ?? beatGridCache
}
