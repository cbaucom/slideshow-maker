export const DEFAULT_WAVEFORM_BUCKET_COUNT = 4096

export type WaveformPeakPair = {
  max: number
  min: number
}

export function computeWaveformPeakPairs(
  samples: Float32Array,
  bucketCount = DEFAULT_WAVEFORM_BUCKET_COUNT,
): WaveformPeakPair[] {
  if (samples.length === 0 || bucketCount <= 0) return []

  const pairs: WaveformPeakPair[] = []
  const samplesPerBucket = Math.max(1, Math.floor(samples.length / bucketCount))

  for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
    const start = bucketIndex * samplesPerBucket
    const end = bucketIndex === bucketCount - 1 ? samples.length : start + samplesPerBucket
    let max = 0
    let min = 0

    for (let sampleIndex = start; sampleIndex < end; sampleIndex++) {
      const sample = samples[sampleIndex]
      if (sample > max) max = sample
      if (sample < min) min = sample
    }

    pairs.push({ max, min })
  }

  const globalPeak = pairs.reduce(
    (currentPeak, pair) => Math.max(currentPeak, pair.max, Math.abs(pair.min)),
    0,
  )
  if (globalPeak <= 0) return pairs.map(() => ({ max: 0, min: 0 }))

  return pairs.map((pair) => ({
    max: pair.max / globalPeak,
    min: pair.min / globalPeak,
  }))
}

/** @deprecated Use computeWaveformPeakPairs for timeline display */
export const DEFAULT_WAVEFORM_BAR_COUNT = 64

/** @deprecated Use computeWaveformPeakPairs for timeline display */
export function computeWaveformPeaks(
  samples: Float32Array,
  barCount = DEFAULT_WAVEFORM_BAR_COUNT,
): number[] {
  return computeWaveformPeakPairs(samples, barCount).map((pair) => pair.max)
}

export function resampleWaveformPeaks(
  pairs: WaveformPeakPair[],
  targetCount: number,
): WaveformPeakPair[] {
  if (pairs.length === 0 || targetCount <= 0) return []
  if (pairs.length === targetCount) return pairs

  const resampled: WaveformPeakPair[] = []
  const sourceCount = pairs.length

  for (let targetIndex = 0; targetIndex < targetCount; targetIndex++) {
    const sourceStart = Math.floor((targetIndex * sourceCount) / targetCount)
    const sourceEnd = Math.max(
      sourceStart + 1,
      Math.floor(((targetIndex + 1) * sourceCount) / targetCount),
    )
    let max = 0
    let min = 0

    for (let sourceIndex = sourceStart; sourceIndex < sourceEnd; sourceIndex++) {
      max = Math.max(max, pairs[sourceIndex].max)
      min = Math.min(min, pairs[sourceIndex].min)
    }

    resampled.push({ max, min })
  }

  return resampled
}

export function buildSymmetricWaveformPath(
  pairs: WaveformPeakPair[],
  width: number,
  height: number,
): string {
  if (pairs.length === 0 || width <= 0 || height <= 0) return ''

  const sampleCount = Math.max(16, Math.floor(width / 2))
  const resampled = resampleWaveformPeaks(pairs, sampleCount)
  const centerY = height / 2
  const halfHeight = (height / 2) * 0.92
  const stepX = width / Math.max(1, resampled.length - 1)

  let path = `M 0 ${centerY}`

  for (let index = 0; index < resampled.length; index++) {
    const x = index * stepX
    const amplitude = Math.max(resampled[index].max, Math.abs(resampled[index].min))
    path += ` L ${x.toFixed(2)} ${(centerY - amplitude * halfHeight).toFixed(2)}`
  }

  path += ` L ${width} ${centerY}`

  for (let index = resampled.length - 1; index >= 0; index--) {
    const x = index * stepX
    const amplitude = Math.max(resampled[index].max, Math.abs(resampled[index].min))
    path += ` L ${x.toFixed(2)} ${(centerY + amplitude * halfHeight).toFixed(2)}`
  }

  path += ' Z'
  return path
}
