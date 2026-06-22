import type { BeatGrid, BeatGridCache } from './types'

export type AudioClipTiming = {
  durationInFrames: number
  filename: string
}

export function beatTimesFromGrid(grid: BeatGrid, durationSecs: number): number[] {
  const beats: number[] = []
  let beatIndex = 0
  let beatTimeSecs = grid.firstBeatOffsetSecs

  while (beatTimeSecs < durationSecs) {
    beats.push(beatTimeSecs)
    beatIndex++
    beatTimeSecs = grid.firstBeatOffsetSecs + beatIndex * grid.beatIntervalSecs
  }

  return beats
}

export function buildConcatenatedBeatTimes(
  clips: AudioClipTiming[],
  cache: BeatGridCache,
  fps = 30,
): number[] {
  const beats: number[] = []
  let clipStartSecs = 0

  for (const clip of clips) {
    const grid = cache[clip.filename]
    const clipDurationSecs = clip.durationInFrames / fps
    if (!grid) {
      clipStartSecs += clipDurationSecs
      continue
    }

    let beatIndex = 0
    let localBeatSecs = grid.firstBeatOffsetSecs
    while (localBeatSecs < clipDurationSecs) {
      beats.push(clipStartSecs + localBeatSecs)
      beatIndex++
      localBeatSecs = grid.firstBeatOffsetSecs + beatIndex * grid.beatIntervalSecs
    }

    clipStartSecs += clipDurationSecs
  }

  return beats.sort((left, right) => left - right)
}

export function totalAudioDurationSecs(clips: AudioClipTiming[], fps = 30): number {
  return clips.reduce((sum, clip) => sum + clip.durationInFrames, 0) / fps
}
