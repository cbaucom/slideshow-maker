import { isTitleSlide } from '../timeline-core/types'
import type { Slide } from '../timeline-core/types'
import type { RenderPlan, RenderPlanEntry } from './types'

export const DEFAULT_PIXELS_PER_FRAME = 2
export const MAX_PIXELS_PER_FRAME = 10
export const MIN_PIXELS_PER_FRAME = 0.5
export const TIMELINE_ZOOM_STEP = 0.25
export const DEFAULT_MIN_BLOCK_WIDTH_PX = 40
export const TIMELINE_BLOCK_GAP_PX = 4

export type TimelineMediaBlock = {
  durationInFrames: number
  leftPx: number
  slideId: string
  widthPx: number
}

export type TimelineAudioBlock = {
  blobUrl: string
  durationInFrames: number
  filename: string
  gainDb: number
  leftPx: number
  startFrame: number
  widthPx: number
}

export type TimelineLayout = {
  audioBlocks: TimelineAudioBlock[]
  mediaBlocks: TimelineMediaBlock[]
  totalWidthPx: number
}

export function firstPassEntries(renderPlan: RenderPlan): RenderPlanEntry[] {
  if (renderPlan.entries.length === 0) return []

  const firstSlideId = renderPlan.entries[0].slide.id
  const pass: RenderPlanEntry[] = []

  for (const entry of renderPlan.entries) {
    if (pass.length > 0 && entry.slide.id === firstSlideId) break
    pass.push(entry)
  }

  return pass
}

function blockWidthPx(
  durationInFrames: number,
  pixelsPerFrame: number,
  minBlockWidthPx: number,
): number {
  return Math.max(minBlockWidthPx, durationInFrames * pixelsPerFrame)
}

function buildMediaBlocks(
  slides: Slide[],
  renderPlan: RenderPlan,
  pixelsPerFrame: number,
  minBlockWidthPx: number,
): TimelineMediaBlock[] {
  const entryBySlideId = new Map(
    firstPassEntries(renderPlan).map((entry) => [entry.slide.id, entry]),
  )
  let packedLeftPx = 0
  const blocks: TimelineMediaBlock[] = []

  for (const slide of slides) {
    const entry = slide.excluded ? undefined : entryBySlideId.get(slide.id)
    const durationInFrames = entry?.durationInFrames
      ?? (isTitleSlide(slide) ? slide.durationInFrames : slide.durationInFrames)
    const widthPx = blockWidthPx(durationInFrames, pixelsPerFrame, minBlockWidthPx)
    const leftPx = entry
      ? entry.startFrame * pixelsPerFrame
      : packedLeftPx

    blocks.push({
      durationInFrames,
      leftPx,
      slideId: slide.id,
      widthPx,
    })

    if (entry) {
      packedLeftPx = Math.max(packedLeftPx, leftPx + widthPx + TIMELINE_BLOCK_GAP_PX)
    } else {
      packedLeftPx += widthPx + TIMELINE_BLOCK_GAP_PX
    }
  }

  return blocks
}

export function buildTimelineLayout(
  slides: Slide[],
  renderPlan: RenderPlan,
  audioFilenames: string[],
  pixelsPerFrame = DEFAULT_PIXELS_PER_FRAME,
  minBlockWidthPx = DEFAULT_MIN_BLOCK_WIDTH_PX,
): TimelineLayout {
  const mediaBlocks = buildMediaBlocks(slides, renderPlan, pixelsPerFrame, minBlockWidthPx)
  const mediaContentWidthPx = mediaBlocks.reduce(
    (maxEnd, block) => Math.max(maxEnd, block.leftPx + block.widthPx),
    0,
  )
  const audioEndPx = (renderPlan.audioSegments ?? []).reduce(
    (maxEnd, segment) => Math.max(
      maxEnd,
      (segment.startFrame + segment.durationInFrames) * pixelsPerFrame,
    ),
    0,
  )
  const totalWidthPx = Math.max(
    minBlockWidthPx,
    renderPlan.totalFrames * pixelsPerFrame,
    mediaContentWidthPx,
    audioEndPx,
  )

  const audioBlocks: TimelineAudioBlock[] = (renderPlan.audioSegments ?? []).map((segment, index) => ({
    blobUrl: segment.blobUrl,
    durationInFrames: segment.durationInFrames,
    filename: audioFilenames[index] ?? segment.blobUrl,
    gainDb: segment.gainDb,
    leftPx: segment.startFrame * pixelsPerFrame,
    startFrame: segment.startFrame,
    widthPx: blockWidthPx(segment.durationInFrames, pixelsPerFrame, minBlockWidthPx),
  }))

  return { audioBlocks, mediaBlocks, totalWidthPx }
}
