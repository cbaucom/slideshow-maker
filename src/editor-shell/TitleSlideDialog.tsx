import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TitleSlide } from '../timeline-core/types'
import type { SlideOverrides, TransitionType } from '../timeline-core'
import { OverrideField } from './OverrideField'

const FPS = 30

type Props = {
  onClose: () => void
  onOverride: (id: string, overrides: SlideOverrides | undefined) => void
  onUpdate: (id: string, updates: Partial<Pick<TitleSlide, 'heading' | 'subtext' | 'style' | 'durationInFrames'>>) => void
  slide: TitleSlide
}

export function TitleSlideDialog({ onClose, onOverride, onUpdate, slide }: Props) {
  const ov = slide.overrides ?? {}

  function setTransition(type: TransitionType) {
    onOverride(slide.id, { ...ov, transitionType: type })
  }

  function clearTransition() {
    const next = { ...ov }
    delete next.transitionType
    onOverride(slide.id, Object.keys(next).length > 0 ? next : undefined)
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Title Slide</DialogTitle>
          <DialogDescription className="sr-only">Title slide settings</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <OverrideField label="Heading" htmlFor={`${slide.id}-heading`}>
            <Input
              id={`${slide.id}-heading`}
              type="text"
              className="h-7 flex-1"
              value={slide.heading}
              onChange={e => onUpdate(slide.id, { heading: e.target.value })}
              placeholder="Enter heading"
            />
          </OverrideField>

          <OverrideField label="Subtext" htmlFor={`${slide.id}-subtext`}>
            <Input
              id={`${slide.id}-subtext`}
              type="text"
              className="h-7 flex-1"
              value={slide.subtext ?? ''}
              onChange={e => onUpdate(slide.id, { subtext: e.target.value || undefined })}
              placeholder="Optional subtext"
            />
          </OverrideField>

          <OverrideField label="Style" htmlFor={`${slide.id}-style`}>
            <Select
              value={slide.style}
              onValueChange={value => onUpdate(slide.id, { style: value as 'light' | 'dark' })}
            >
              <SelectTrigger id={`${slide.id}-style`} size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
          </OverrideField>

          <OverrideField label="Duration" htmlFor={`${slide.id}-duration`}>
            <Input
              id={`${slide.id}-duration`}
              type="number"
              className="h-7 w-16 text-right"
              min={1}
              max={30}
              step={0.5}
              value={slide.durationInFrames / FPS}
              onChange={e => {
                const v = parseFloat(e.target.value)
                if (!isNaN(v) && v >= 1 && v <= 30) onUpdate(slide.id, { durationInFrames: Math.round(v * FPS) })
              }}
            />
            <span className="text-xs text-muted-foreground">s</span>
          </OverrideField>

          <OverrideField
            label="Transition"
            htmlFor={`${slide.id}-transition`}
            isOverridden={ov.transitionType !== undefined}
            onReset={clearTransition}
          >
            <Select
              value={ov.transitionType ?? 'global'}
              onValueChange={value => {
                if (value === 'global') clearTransition()
                else setTransition(value as TransitionType)
              }}
            >
              <SelectTrigger id={`${slide.id}-transition`} size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global default</SelectItem>
                <SelectItem value="crossfade">Crossfade</SelectItem>
                <SelectItem value="dip-to-black">Dip to black</SelectItem>
                <SelectItem value="cut">Cut</SelectItem>
              </SelectContent>
            </Select>
          </OverrideField>
        </div>
      </DialogContent>
    </Dialog>
  )
}
