import type { LoudnessCacheEntry } from './types'

export function resolveEffectiveGainDb(
  manualGainDb: number | undefined,
  cacheEntry: LoudnessCacheEntry | undefined,
): number {
  if (manualGainDb !== undefined) return manualGainDb
  if (cacheEntry) return cacheEntry.offsetDb
  return 0
}

export function isLoudnessCacheEntryValid(
  entry: LoudnessCacheEntry | undefined,
  byteLength: number,
): boolean {
  return entry !== undefined && entry.byteLength === byteLength
}
