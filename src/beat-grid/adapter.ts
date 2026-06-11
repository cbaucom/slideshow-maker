/**
 * Thin Web Audio decode adapter.  Decodes an audio ArrayBuffer and returns
 * a mono Float32Array with the track's sample rate.  Not tested directly —
 * detection math is tested with synthetic buffers in detection.test.ts.
 */
export async function decodeMono(
  arrayBuffer: ArrayBuffer,
): Promise<{ samples: Float32Array; sampleRate: number }> {
  const ctx = new AudioContext()
  let audioBuffer: AudioBuffer
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer)
  } finally {
    await ctx.close()
  }

  const { length, numberOfChannels, sampleRate } = audioBuffer
  const mono = new Float32Array(length)
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const channelData = audioBuffer.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      mono[i] += channelData[i]
    }
  }
  if (numberOfChannels > 1) {
    for (let i = 0; i < length; i++) {
      mono[i] /= numberOfChannels
    }
  }

  return { samples: mono, sampleRate }
}
