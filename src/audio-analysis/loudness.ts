/** Target RMS level in dBFS for normalized soundtrack playback. */
export const TARGET_RMS_DBFS = -18

const MIN_LINEAR = 1e-10

export function computePeak(samples: Float32Array): number {
  let peak = 0
  for (let index = 0; index < samples.length; index++) {
    const absolute = Math.abs(samples[index])
    if (absolute > peak) peak = absolute
  }
  return peak
}

export function computeRms(samples: Float32Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (let index = 0; index < samples.length; index++) {
    const sample = samples[index]
    sum += sample * sample
  }
  return Math.sqrt(sum / samples.length)
}

export function linearToDb(linear: number): number {
  if (linear <= MIN_LINEAR) return -100
  return 20 * Math.log10(linear)
}

/**
 * Recommended gain (dB) to bring `samples` RMS to `targetDbfs`, capped so peak
 * does not exceed 0 dBFS after applying the gain.
 */
export function recommendedGainDb(
  samples: Float32Array,
  targetDbfs = TARGET_RMS_DBFS,
): number {
  const rms = computeRms(samples)
  const peak = computePeak(samples)
  const currentRmsDb = linearToDb(rms)
  if (!Number.isFinite(currentRmsDb) || currentRmsDb <= -100) return 0

  const rmsGainDb = targetDbfs - currentRmsDb
  const peakDb = linearToDb(peak)
  const peakLimitGainDb = Number.isFinite(peakDb) ? -peakDb : rmsGainDb

  return Math.min(rmsGainDb, peakLimitGainDb)
}

export function rmsDbAfterGain(samples: Float32Array, gainDb: number): number {
  const gain = Math.pow(10, gainDb / 20)
  if (samples.length === 0) return -100
  let sum = 0
  for (let index = 0; index < samples.length; index++) {
    const scaled = samples[index] * gain
    sum += scaled * scaled
  }
  return linearToDb(Math.sqrt(sum / samples.length))
}
