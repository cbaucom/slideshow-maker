import type { Energy } from '../timeline-core/settings'

const ENERGY_MULTIPLIER: Record<Energy, number> = {
  calm: 1.5,
  medium: 1.0,
  punchy: 0.67,
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

  let nearestBeatSecs = beatTimesSecs[0]
  let minDistance = Math.abs(nearestBeatSecs - targetEndSecs)

  for (const beatSecs of beatTimesSecs) {
    if (beatSecs < startSecs) continue
    const distance = Math.abs(beatSecs - targetEndSecs)
    if (distance < minDistance) {
      minDistance = distance
      nearestBeatSecs = beatSecs
    }
  }

  const endFrame = Math.round(nearestBeatSecs * fps)
  return Math.max(1, endFrame - startFrame)
}
