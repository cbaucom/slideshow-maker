import { describe, expect, it } from 'vitest'
import type { RenderPlan } from './types'
import {
  buildTimelineLayout,
  DEFAULT_MIN_BLOCK_WIDTH_PX,
  DEFAULT_PIXELS_PER_FRAME,
  firstPassEntries,
} from './timelineLayout'

function imageEntry(id: string, startFrame: number, durationInFrames: number): RenderPlan['entries'][number] {
  return {
    durationInFrames,
    fitMode: 'cover',
    kenBurns: null,
    slide: {
      blobUrl: `blob:${id}`,
      durationInFrames,
      excluded: false,
      filename: `${id}.jpg`,
      id,
      type: 'image',
    },
    startFrame,
    videoVolume: 0,
  }
}

describe('firstPassEntries', () => {
  it('returns all entries when there is no loop', () => {
    const renderPlan: RenderPlan = {
      entries: [
        imageEntry('a', 0, 90),
        imageEntry('b', 75, 120),
      ],
      totalFrames: 195,
    }

    expect(firstPassEntries(renderPlan)).toHaveLength(2)
  })

  it('stops at the second occurrence of the first slide id', () => {
    const renderPlan: RenderPlan = {
      entries: [
        imageEntry('a', 0, 90),
        imageEntry('b', 75, 90),
        imageEntry('a', 150, 90),
      ],
      totalFrames: 240,
    }

    expect(firstPassEntries(renderPlan)).toHaveLength(2)
  })
})

describe('buildTimelineLayout', () => {
  it('assigns proportional widths to media blocks', () => {
    const renderPlan: RenderPlan = {
      entries: [
        imageEntry('a', 0, 60),
        imageEntry('b', 45, 120),
      ],
      totalFrames: 165,
    }

    const layout = buildTimelineLayout(
      [
        renderPlan.entries[0].slide,
        renderPlan.entries[1].slide,
      ],
      renderPlan,
      [],
    )

    expect(layout.mediaBlocks[0].leftPx).toBe(0)
    expect(layout.mediaBlocks[0].widthPx).toBe(60 * DEFAULT_PIXELS_PER_FRAME)
    expect(layout.mediaBlocks[1].leftPx).toBe(45 * DEFAULT_PIXELS_PER_FRAME)
    expect(layout.mediaBlocks[1].widthPx).toBe(120 * DEFAULT_PIXELS_PER_FRAME)
    expect(layout.totalWidthPx).toBeGreaterThanOrEqual(165 * DEFAULT_PIXELS_PER_FRAME)
  })

  it('aligns included slides to render plan start frames', () => {
    const renderPlan: RenderPlan = {
      entries: [
        imageEntry('a', 0, 90),
        imageEntry('b', 75, 90),
      ],
      totalFrames: 165,
    }

    const layout = buildTimelineLayout(
      [
        renderPlan.entries[0].slide,
        renderPlan.entries[1].slide,
      ],
      renderPlan,
      [],
    )

    expect(layout.mediaBlocks[0].leftPx).toBe(0)
    expect(layout.mediaBlocks[1].leftPx).toBe(75 * DEFAULT_PIXELS_PER_FRAME)
  })

  it('packs excluded slides after the previous block in storyboard order', () => {
    const included = imageEntry('a', 0, 60)
    const excludedSlide = {
      ...imageEntry('b', 0, 30).slide,
      excluded: true,
    }
    const renderPlan: RenderPlan = {
      entries: [included],
      totalFrames: 60,
    }

    const layout = buildTimelineLayout(
      [included.slide, excludedSlide],
      renderPlan,
      [],
    )

    expect(layout.mediaBlocks[0].leftPx).toBe(0)
    expect(layout.mediaBlocks[1].leftPx).toBe(60 * DEFAULT_PIXELS_PER_FRAME + 4)
  })

  it('enforces a minimum block width for very short slides', () => {
    const renderPlan: RenderPlan = {
      entries: [imageEntry('a', 0, 5)],
      totalFrames: 5,
    }

    const layout = buildTimelineLayout([renderPlan.entries[0].slide], renderPlan, [])

    expect(layout.mediaBlocks[0].widthPx).toBe(DEFAULT_MIN_BLOCK_WIDTH_PX)
  })

  it('places audio blocks at segment start frames', () => {
    const renderPlan: RenderPlan = {
      audioSegments: [
        {
          blobUrl: 'blob:one',
          durationInFrames: 90,
          gainDb: 0,
          startFrame: 0,
        },
        {
          blobUrl: 'blob:two',
          durationInFrames: 60,
          gainDb: -3,
          startFrame: 90,
        },
      ],
      entries: [imageEntry('a', 0, 90)],
      totalFrames: 150,
    }

    const layout = buildTimelineLayout([renderPlan.entries[0].slide], renderPlan, ['one.mp3', 'two.mp3'])

    expect(layout.audioBlocks).toEqual([
      expect.objectContaining({
        filename: 'one.mp3',
        leftPx: 0,
        startFrame: 0,
        widthPx: 90 * DEFAULT_PIXELS_PER_FRAME,
      }),
      expect.objectContaining({
        filename: 'two.mp3',
        gainDb: -3,
        leftPx: 90 * DEFAULT_PIXELS_PER_FRAME,
        startFrame: 90,
        widthPx: 60 * DEFAULT_PIXELS_PER_FRAME,
      }),
    ])
  })
})
