import { describe, it, expect } from 'vitest'
import { getMediaType, isSupportedAudio, isSupportedMedia, sortByFilename } from './media'

describe('isSupportedMedia', () => {
  it.each([
    ['photo.jpg', true],
    ['photo.JPG', true],
    ['photo.jpeg', true],
    ['photo.png', true],
    ['photo.PNG', true],
    ['photo.heic', true],
    ['photo.HEIC', true],
    ['clip.mp4', true],
    ['clip.MP4', true],
    ['clip.mov', true],
    ['clip.MOV', true],
    ['document.pdf', false],
    ['audio.mp3', false],
    ['slideshow.json', false],
    ['.DS_Store', false],
    ['notes.txt', false],
  ])('isSupportedMedia(%s) === %s', (filename, expected) => {
    expect(isSupportedMedia(filename)).toBe(expected)
  })
})

describe('isSupportedAudio', () => {
  it.each([
    ['track.mp3', true],
    ['track.MP3', true],
    ['track.m4a', true],
    ['track.M4A', true],
    ['track.wav', true],
    ['track.WAV', true],
    ['photo.jpg', false],
    ['clip.mp4', false],
    ['slideshow.json', false],
  ])('isSupportedAudio(%s) === %s', (filename, expected) => {
    expect(isSupportedAudio(filename)).toBe(expected)
  })
})

describe('getMediaType', () => {
  it.each([
    ['photo.jpg', 'image'],
    ['photo.jpeg', 'image'],
    ['photo.png', 'image'],
    ['photo.heic', 'image'],
    ['clip.mp4', 'video'],
    ['clip.mov', 'video'],
  ] as const)('getMediaType(%s) === %s', (filename, expected) => {
    expect(getMediaType(filename)).toBe(expected)
  })
})

describe('sortByFilename', () => {
  it('sorts filenames lexicographically', () => {
    const input = ['zebra.jpg', 'apple.mp4', 'mango.png', 'banana.mov']
    expect(sortByFilename(input)).toEqual([
      'apple.mp4',
      'banana.mov',
      'mango.png',
      'zebra.jpg',
    ])
  })

  it('is case-insensitive', () => {
    const input = ['Zebra.jpg', 'apple.mp4']
    expect(sortByFilename(input)).toEqual(['apple.mp4', 'Zebra.jpg'])
  })

  it('preserves order for equal names', () => {
    const input = ['a.jpg', 'b.jpg']
    expect(sortByFilename(input)).toEqual(['a.jpg', 'b.jpg'])
  })
})
