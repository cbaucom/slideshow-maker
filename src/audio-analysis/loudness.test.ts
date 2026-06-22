import { describe, expect, it } from 'vitest'
import {
  computeRms,
  linearToDb,
  recommendedGainDb,
  rmsDbAfterGain,
  TARGET_RMS_DBFS,
} from './loudness'

function constantAmplitudeSamples(amplitude: number, length = 44100): Float32Array {
  const samples = new Float32Array(length)
  for (let index = 0; index < length; index++) {
    samples[index] = amplitude
  }
  return samples
}

describe('recommendedGainDb', () => {
  it('normalizes tracks with different RMS to within ±1 dB of target', () => {
    const quiet = constantAmplitudeSamples(0.01)
    const loud = constantAmplitudeSamples(0.1)

    const quietGain = recommendedGainDb(quiet)
    const loudGain = recommendedGainDb(loud)

    expect(rmsDbAfterGain(quiet, quietGain)).toBeGreaterThanOrEqual(TARGET_RMS_DBFS - 1)
    expect(rmsDbAfterGain(quiet, quietGain)).toBeLessThanOrEqual(TARGET_RMS_DBFS + 1)
    expect(rmsDbAfterGain(loud, loudGain)).toBeGreaterThanOrEqual(TARGET_RMS_DBFS - 1)
    expect(rmsDbAfterGain(loud, loudGain)).toBeLessThanOrEqual(TARGET_RMS_DBFS + 1)
  })

  it('matches table expectations for known RMS levels', () => {
    const cases = [
      { amplitude: 0.1, expectedCurrentDb: -20 },
      { amplitude: 0.01, expectedCurrentDb: -40 },
    ]

    for (const { amplitude, expectedCurrentDb } of cases) {
      const samples = constantAmplitudeSamples(amplitude)
      expect(linearToDb(computeRms(samples))).toBeCloseTo(expectedCurrentDb, 5)
      const gainDb = recommendedGainDb(samples)
      expect(rmsDbAfterGain(samples, gainDb)).toBeCloseTo(TARGET_RMS_DBFS, 1)
    }
  })

  it('caps gain so peak does not exceed 0 dBFS', () => {
    const samples = constantAmplitudeSamples(0.5)
    const gainDb = recommendedGainDb(samples)
    const peakAfter = 0.5 * Math.pow(10, gainDb / 20)
    expect(peakAfter).toBeLessThanOrEqual(1)
  })
})
