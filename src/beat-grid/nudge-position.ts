import type { Energy } from '../timeline-core/settings'

const ENERGY_MULTIPLIER: Record<Energy, number> = {
  calm: 1.5,
  medium: 1.0,
  punchy: 0.67,
}

function lowerBoundBeatIndex(beatTimesSecs: number[], secs: number): number {
  let low = 0
  let high = beatTimesSecs.length
  while (low < high) {
    const mid = (low + high) >> 1
    if (beatTimesSecs[mid] < secs) {
      low = mid + 1
    } else {
      high = mid
    }
  }
  return low
}

export function nudgeSlideEndFrame(
  startFrame: number,
  targetDurationFrames: number,
  beatTimesSecs: number[],
  energy: Energy,
  fps = 30,
): number {
  if (beatTimesSecs.length === 0) return Math.round(targetDurationFrames)

  const scaledTargetFrames = targetDurationFrames * ENERGY_MULTIPLIER[energy]
  const startSecs = startFrame / fps
  const targetEndSecs = startSecs + scaledTargetFrames / fps

  const startBeatIndex = lowerBoundBeatIndex(beatTimesSecs, startSecs)
  if (startBeatIndex >= beatTimesSecs.length) {
    const endFrame = Math.round(beatTimesSecs[beatTimesSecs.length - 1] * fps)
    return Math.max(1, endFrame - startFrame)
  }

  const nearestBeatIndex = lowerBoundBeatIndex(beatTimesSecs, targetEndSecs)
  let nearestBeatSecs = beatTimesSecs[startBeatIndex]
  let minDistance = Math.abs(nearestBeatSecs - targetEndSecs)

  for (const candidateIndex of [nearestBeatIndex - 1, nearestBeatIndex, nearestBeatIndex + 1]) {
    if (candidateIndex < startBeatIndex || candidateIndex >= beatTimesSecs.length) continue
    const beatSecs = beatTimesSecs[candidateIndex]
    const distance = Math.abs(beatSecs - targetEndSecs)
    if (distance < minDistance) {
      minDistance = distance
      nearestBeatSecs = beatSecs
    }
  }

  const endFrame = Math.round(nearestBeatSecs * fps)
  return Math.max(1, endFrame - startFrame)
}
