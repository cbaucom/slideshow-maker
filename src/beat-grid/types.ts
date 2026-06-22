export type BeatGrid = {
  bpm: number
  firstBeatOffsetSecs: number
  beatIntervalSecs: number
}

export type BeatGridCache = Record<string, BeatGrid>
