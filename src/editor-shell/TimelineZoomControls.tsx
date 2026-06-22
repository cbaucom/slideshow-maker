import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  MAX_PIXELS_PER_FRAME,
  MIN_PIXELS_PER_FRAME,
  TIMELINE_ZOOM_STEP,
} from '../sequence-planner'

type Props = {
  onResetZoom: () => void
  onZoomChange: (pixelsPerFrame: number) => void
  onZoomIn: () => void
  onZoomOut: () => void
  pixelsPerFrame: number
  zoomPercent: number
}

export function TimelineZoomControls({
  onResetZoom,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  pixelsPerFrame,
  zoomPercent,
}: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <Button
        aria-label="Zoom out timeline"
        className="size-6"
        onClick={onZoomOut}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <Minus aria-hidden className="size-3" />
      </Button>
      <Slider
        aria-label="Timeline zoom"
        className="w-20"
        max={MAX_PIXELS_PER_FRAME}
        min={MIN_PIXELS_PER_FRAME}
        onValueChange={(values) => {
          const nextValue = values[0]
          if (nextValue !== undefined) onZoomChange(nextValue)
        }}
        step={TIMELINE_ZOOM_STEP}
        value={[pixelsPerFrame]}
      />
      <Button
        aria-label="Zoom in timeline"
        className="size-6"
        onClick={onZoomIn}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <Plus aria-hidden className="size-3" />
      </Button>
      <button
        className="min-w-10 text-[10px] tabular-nums text-muted-foreground hover:text-foreground"
        onClick={onResetZoom}
        title="Reset zoom to 100%"
        type="button"
      >
        {zoomPercent}%
      </button>
    </div>
  )
}
