import { describe, expect, it } from 'vitest'
import { isLoudnessCacheEntryValid, resolveEffectiveGainDb } from './gain'

describe('resolveEffectiveGainDb', () => {
  it('uses manual gain when set', () => {
    expect(resolveEffectiveGainDb(-3, { byteLength: 100, offsetDb: 6 })).toBe(-3)
  })

  it('uses cache offset when manual gain is absent', () => {
    expect(resolveEffectiveGainDb(undefined, { byteLength: 100, offsetDb: 6 })).toBe(6)
  })

  it('returns 0 when neither manual nor cache exists', () => {
    expect(resolveEffectiveGainDb(undefined, undefined)).toBe(0)
  })
})

describe('isLoudnessCacheEntryValid', () => {
  it('is valid when byteLength matches', () => {
    expect(isLoudnessCacheEntryValid({ byteLength: 42, offsetDb: 1 }, 42)).toBe(true)
  })

  it('is invalid when byteLength differs', () => {
    expect(isLoudnessCacheEntryValid({ byteLength: 42, offsetDb: 1 }, 99)).toBe(false)
  })
})
