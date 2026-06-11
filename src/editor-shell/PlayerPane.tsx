import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { Maximize2, Minimize2 } from 'lucide-react'
import { Player, type PlayerRef } from '@remotion/player'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { RenderPlan } from '../sequence-planner'
import { SlideshowComposition } from '../composition'

export const FPS = 30
export const COMP_WIDTH = 1920
export const COMP_HEIGHT = 1080

type Props = {
  onFrameChange: (frame: number) => void
  playerRef?: React.RefObject<PlayerRef | null>
  renderPlan: RenderPlan
  totalFrames: number
}

export function PlayerPane({ onFrameChange, playerRef, renderPlan, totalFrames }: Props) {
  const embeddedHostRef = useRef<HTMLDivElement>(null)
  const presentationHostRef = useRef<HTMLDivElement>(null)
  const fallbackPlayerRef = useRef<PlayerRef>(null)
  const resolvedPlayerRef = playerRef ?? fallbackPlayerRef
  const [isPresenting, setIsPresenting] = useState(false)
  const [presentationFrame, setPresentationFrame] = useState(0)

  useEffect(() => {
    let animationFrameId = 0
    let lastReportedFrame = -1

    function pollCurrentFrame() {
      const frame = resolvedPlayerRef.current?.getCurrentFrame()
      if (frame !== undefined && frame !== lastReportedFrame) {
        lastReportedFrame = frame
        onFrameChange(frame)
      }
      animationFrameId = requestAnimationFrame(pollCurrentFrame)
    }

    animationFrameId = requestAnimationFrame(pollCurrentFrame)
    return () => cancelAnimationFrame(animationFrameId)
  }, [isPresenting, onFrameChange, renderPlan, resolvedPlayerRef, totalFrames])

  function enterPresentation() {
    const frame = resolvedPlayerRef.current?.getCurrentFrame() ?? 0
    flushSync(() => {
      setPresentationFrame(frame)
      setIsPresenting(true)
    })
    void presentationHostRef.current?.requestFullscreen()
  }

  const exitPresentation = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    }
    setIsPresenting(false)
  }, [])

  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        setIsPresenting(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    if (!isPresenting) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        exitPresentation()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [exitPresentation, isPresenting])

  function renderPlayer(initialFrame?: number) {
    return (
      <Player
        ref={resolvedPlayerRef}
        allowFullscreen={false}
        component={SlideshowComposition}
        controls
        durationInFrames={totalFrames}
        compositionWidth={COMP_WIDTH}
        compositionHeight={COMP_HEIGHT}
        fps={FPS}
        initialFrame={initialFrame}
        inputProps={{ plan: renderPlan }}
        spaceKeyToPlayOrPause
        style={{ height: '100%', width: '100%' }}
      />
    )
  }

  const presentationLayer = isPresenting ? (
    <div
      ref={presentationHostRef}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black"
    >
      {renderPlayer(presentationFrame)}
      <Button
        aria-label="Exit fullscreen"
        className="absolute top-3 right-3 z-10 bg-black/60 text-white hover:bg-black/80"
        onClick={exitPresentation}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <Minimize2 aria-hidden />
      </Button>
    </div>
  ) : null

  return (
    <>
      <div
        ref={embeddedHostRef}
        className={cn(
          'relative flex h-full min-h-0 w-full min-w-0 items-center justify-center overflow-hidden bg-black p-3',
          isPresenting && 'invisible',
        )}
      >
        {!isPresenting ? renderPlayer() : null}
        <Button
          aria-label="Present fullscreen"
          className="absolute top-3 right-3 z-10 gap-1.5 bg-black/60 pr-2.5 pl-2 text-white hover:bg-black/80"
          onClick={enterPresentation}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Maximize2 aria-hidden className="size-3.5" />
          <span className="text-xs">Present</span>
        </Button>
      </div>
      {presentationLayer ? createPortal(presentationLayer, document.body) : null}
    </>
  )
}
