import type { BeatGrid } from './types'

const HOP_SIZE = 512
const MAX_ANALYSIS_SECS = 30

function analysisSamples(samples: Float32Array, sampleRate: number): Float32Array {
  const maxSamples = sampleRate * MAX_ANALYSIS_SECS
  return samples.length > maxSamples ? samples.subarray(0, maxSamples) : samples
}

/** Compute RMS energy per hop. */
function computeEnergy(samples: Float32Array): Float32Array {
  const nFrames = Math.floor(samples.length / HOP_SIZE)
  const energy = new Float32Array(nFrames)
  for (let f = 0; f < nFrames; f++) {
    const start = f * HOP_SIZE
    const end = start + HOP_SIZE
    let sum = 0
    for (let i = start; i < end; i++) {
      sum += samples[i] * samples[i]
    }
    energy[f] = Math.sqrt(sum / HOP_SIZE)
  }
  return energy
}

/** Onset strength = positive first difference of energy. */
function computeOnsetStrength(energy: Float32Array): Float32Array {
  const onset = new Float32Array(energy.length)
  for (let f = 1; f < energy.length; f++) {
    onset[f] = Math.max(0, energy[f] - energy[f - 1])
  }
  return onset
}

/**
 * Find the lag in [minLag, maxLag] that maximises autocorrelation of the
 * onset strength signal.  Uses only the first `maxFrames` of the signal to
 * keep runtime predictable on long tracks.
 */
function findBeatPeriodLag(
  onset: Float32Array,
  minLag: number,
  maxLag: number,
  maxFrames = 2600,
): number {
  const n = Math.min(onset.length, maxFrames)
  let bestLag = minLag
  let bestCorr = -Infinity

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0
    for (let i = 0; i < n - lag; i++) {
      corr += onset[i] * onset[i + lag]
    }
    if (corr > bestCorr) {
      bestCorr = corr
      bestLag = lag
    }
  }
  return bestLag
}

/**
 * Given a detected beat period in hops, find the phase offset (in hops from
 * the start) that best aligns with the onset peaks.
 */
function findBeatPhase(onset: Float32Array, periodLag: number): number {
  const phaseStrength = new Float32Array(periodLag)
  for (let i = 0; i < onset.length; i++) {
    phaseStrength[i % periodLag] += onset[i]
  }
  let bestPhase = 0
  let bestStrength = -Infinity
  for (let p = 0; p < periodLag; p++) {
    if (phaseStrength[p] > bestStrength) {
      bestStrength = phaseStrength[p]
      bestPhase = p
    }
  }
  return bestPhase
}

/**
 * Estimate BPM, beat interval, and first-beat offset from raw mono PCM data.
 * Pure math — no browser APIs.
 */
export function detectBeatGrid(samples: Float32Array, sampleRate: number): BeatGrid {
  const clipped = analysisSamples(samples, sampleRate)
  const energy = computeEnergy(clipped)
  const onset = computeOnsetStrength(energy)

  // Lag range corresponding to [60, 200] BPM
  const lagMin = Math.max(1, Math.floor((sampleRate * 60) / (200 * HOP_SIZE)))
  const lagMax = Math.max(lagMin, Math.floor((sampleRate * 60) / (60 * HOP_SIZE)))

  const bestLag = findBeatPeriodLag(onset, lagMin, lagMax)
  const bpm = (60 * sampleRate) / (HOP_SIZE * bestLag)
  const beatIntervalSecs = 60 / bpm

  const bestPhase = findBeatPhase(onset, bestLag)
  const firstBeatOffsetSecs = (bestPhase * HOP_SIZE) / sampleRate

  return { bpm, beatIntervalSecs, firstBeatOffsetSecs }
}
