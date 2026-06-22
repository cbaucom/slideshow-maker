import type { AudioClip } from './types'

export function addAudioClip(clips: AudioClip[], filename: string): AudioClip[] {
  if (clips.some((clip) => clip.filename === filename)) return clips
  return [...clips, { filename }]
}

export function moveAudioClip(clips: AudioClip[], fromIndex: number, toIndex: number): AudioClip[] {
  if (fromIndex === toIndex) return clips
  const result = [...clips]
  const [item] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, item)
  return result
}

export function removeAudioClip(clips: AudioClip[], index: number): AudioClip[] {
  return clips.filter((_, clipIndex) => clipIndex !== index)
}
