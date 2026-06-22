import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_PIXELS_PER_FRAME,
  MAX_PIXELS_PER_FRAME,
  MIN_PIXELS_PER_FRAME,
  TIMELINE_ZOOM_STEP,
} from '../sequence-planner'

function clampPixelsPerFrame(value: number): number {
  return Math.min(MAX_PIXELS_PER_FRAME, Math.max(MIN_PIXELS_PER_FRAME, value))
}

type Options = {
  scrollRef: React.RefObject<HTMLDivElement | null>
}

export function useTimelineZoom({ scrollRef }: Options) {
  const [pixelsPerFrame, setPixelsPerFrameState] = useState(DEFAULT_PIXELS_PER_FRAME)

  const setPixelsPerFrame = useCallback((nextValue: number | ((previous: number) => number)) => {
    setPixelsPerFrameState((previousValue) => {
      const resolvedValue = clampPixelsPerFrame(
        typeof nextValue === 'function' ? nextValue(previousValue) : nextValue,
      )

      if (resolvedValue === previousValue) return previousValue

      const scrollElement = scrollRef.current
      const centerScroll = scrollElement
        ? scrollElement.scrollLeft + scrollElement.clientWidth / 2
        : null
      const zoomRatio = resolvedValue / previousValue

      if (centerScroll !== null) {
        requestAnimationFrame(() => {
          const element = scrollRef.current
          if (!element) return
          element.scrollLeft = Math.max(
            0,
            centerScroll * zoomRatio - element.clientWidth / 2,
          )
        })
      }

      return resolvedValue
    })
  }, [scrollRef])

  const zoomIn = useCallback(() => {
    setPixelsPerFrame((previous) => previous + TIMELINE_ZOOM_STEP)
  }, [setPixelsPerFrame])

  const zoomOut = useCallback(() => {
    setPixelsPerFrame((previous) => previous - TIMELINE_ZOOM_STEP)
  }, [setPixelsPerFrame])

  const resetZoom = useCallback(() => {
    setPixelsPerFrame(DEFAULT_PIXELS_PER_FRAME)
  }, [setPixelsPerFrame])

  useEffect(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement) return

    function handleWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()

      const factor = event.deltaY > 0 ? 0.9 : 1.1
      setPixelsPerFrame((previous) => previous * factor)
    }

    scrollElement.addEventListener('wheel', handleWheel, { passive: false })
    return () => scrollElement.removeEventListener('wheel', handleWheel)
  }, [scrollRef, setPixelsPerFrame])

  const zoomPercent = Math.round((pixelsPerFrame / DEFAULT_PIXELS_PER_FRAME) * 100)

  return {
    pixelsPerFrame,
    resetZoom,
    setPixelsPerFrame,
    zoomIn,
    zoomOut,
    zoomPercent,
  }
}
