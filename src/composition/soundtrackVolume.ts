import { interpolate } from 'remotion'
import type { DuckingEnvelope } from '../sequence-planner/types'

export function volumeAtFrame(envelope: DuckingEnvelope, frame: number): number {
  const { keyframes, rampFrames } = envelope
  if (keyframes.length === 0) return 1

  let active = keyframes[0]
  let next = keyframes[0]

  for (let index = 0; index < keyframes.length; index++) {
    if (keyframes[index].frame <= frame) {
      active = keyframes[index]
      next = keyframes[Math.min(index + 1, keyframes.length - 1)]
      continue
    }
    next = keyframes[index]
    break
  }

  if (active.frame === next.frame || frame <= active.frame) {
    return active.volume
  }

  const rampEndFrame = Math.min(active.frame + rampFrames, next.frame)
  if (frame >= next.frame) {
    return next.volume
  }
  if (frame <= rampEndFrame && active.volume !== next.volume) {
    return interpolate(frame, [active.frame, rampEndFrame], [active.volume, next.volume], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  }

  return active.volume
}
