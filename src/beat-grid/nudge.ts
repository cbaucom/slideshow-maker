import type { Energy } from '../timeline-core/settings'
import type { BeatGrid } from './types'

// Energy multipliers: calm extends target (longer slides), punchy compresses it (shorter).
const ENERGY_MULTIPLIER: Record<Energy, number> = {
  calm: 1.5,
  medium: 1.0,
  punchy: 0.67,
}

/**
 * Snap a slide's target duration to the nearest beat boundary.
 *
 * Energy scales the target before snapping so that calm energy tends toward
 * longer slides and punchy toward shorter ones.  For energy=medium the
 * multiplier is 1.0, so deviation from the passed-in target is always
 * ≤ half a beat interval — the basic beat-sync contract.
 */
export function nudge(
  targetDurationFrames: number,
  beatGrid: BeatGrid,
  energy: Energy,
  fps = 30,
): number {
  const beatFrames = beatGrid.beatIntervalSecs * fps
  if (beatFrames <= 0) return Math.round(targetDurationFrames)

  const scaledTarget = targetDurationFrames * ENERGY_MULTIPLIER[energy]
  const beatCount = Math.max(1, Math.round(scaledTarget / beatFrames))
  return Math.round(beatCount * beatFrames)
}
