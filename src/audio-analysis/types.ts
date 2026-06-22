export type LoudnessCacheEntry = {
  byteLength: number
  offsetDb: number
}

export type LoudnessCache = Record<string, LoudnessCacheEntry>
