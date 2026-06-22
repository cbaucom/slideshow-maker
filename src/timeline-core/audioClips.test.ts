import { describe, expect, it } from 'vitest'
import { addAudioClip, moveAudioClip, removeAudioClip, updateAudioClipGain } from './audioClips'
import type { AudioClip } from './types'

const CLIPS: AudioClip[] = [
  { filename: 'a.mp3' },
  { filename: 'b.mp3' },
  { filename: 'c.mp3' },
]

describe('audio clip ordering', () => {
  it('adds a clip when not already present', () => {
    expect(addAudioClip(CLIPS, 'd.mp3')).toEqual([...CLIPS, { filename: 'd.mp3' }])
  })

  it('does not duplicate an existing clip', () => {
    expect(addAudioClip(CLIPS, 'b.mp3')).toBe(CLIPS)
  })

  it('moves a clip to a new position', () => {
    expect(moveAudioClip(CLIPS, 0, 2)).toEqual([
      { filename: 'b.mp3' },
      { filename: 'c.mp3' },
      { filename: 'a.mp3' },
    ])
  })

  it('removes a clip by index', () => {
    expect(removeAudioClip(CLIPS, 1)).toEqual([
      { filename: 'a.mp3' },
      { filename: 'c.mp3' },
    ])
  })

  it('updates manual gain and clears it when undefined', () => {
    expect(updateAudioClipGain(CLIPS, 1, -3)).toEqual([
      { filename: 'a.mp3' },
      { filename: 'b.mp3', gainDb: -3 },
      { filename: 'c.mp3' },
    ])
    expect(updateAudioClipGain(
      [{ filename: 'b.mp3', gainDb: -3 }],
      0,
      undefined,
    )).toEqual([{ filename: 'b.mp3' }])
  })
})
