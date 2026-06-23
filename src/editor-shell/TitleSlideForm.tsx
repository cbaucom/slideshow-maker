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
  onOverride: (id: string, overrides: SlideOverrides | undefined) => void
  onUpdate: (id: string, updates: Partial<Pick<TitleSlide, 'heading' | 'subtext' | 'style' | 'durationInFrames'>>) => void
  slide: TitleSlide
}

export function TitleSlideForm({ onOverride, onUpdate, slide }: Props) {
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
    <div className="flex flex-col gap-3">
      <OverrideField htmlFor={`${slide.id}-heading`} label="Heading">
        <Input
          className="h-7 flex-1"
          id={`${slide.id}-heading`}
          onChange={(event) => onUpdate(slide.id, { heading: event.target.value })}
          placeholder="Enter heading"
          type="text"
          value={slide.heading}
        />
      </OverrideField>

      <OverrideField htmlFor={`${slide.id}-subtext`} label="Subtext">
        <Input
          className="h-7 flex-1"
          id={`${slide.id}-subtext`}
          onChange={(event) => onUpdate(slide.id, { subtext: event.target.value || undefined })}
          placeholder="Optional subtext"
          type="text"
          value={slide.subtext ?? ''}
        />
      </OverrideField>

      <OverrideField htmlFor={`${slide.id}-style`} label="Style">
        <Select
          onValueChange={(value) => onUpdate(slide.id, { style: value as 'dark' | 'light' })}
          value={slide.style}
        >
          <SelectTrigger className="w-full" id={`${slide.id}-style`} size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="light">Light</SelectItem>
          </SelectContent>
        </Select>
      </OverrideField>

      <OverrideField htmlFor={`${slide.id}-duration`} label="Duration">
        <Input
          className="h-7 w-16 text-right"
          id={`${slide.id}-duration`}
          max={30}
          min={1}
          onChange={(event) => {
            const value = parseFloat(event.target.value)
            if (!isNaN(value) && value >= 1 && value <= 30) {
              onUpdate(slide.id, { durationInFrames: Math.round(value * FPS) })
            }
          }}
          step={0.5}
          type="number"
          value={slide.durationInFrames / FPS}
        />
        <span className="text-xs text-muted-foreground">s</span>
      </OverrideField>

      <OverrideField
        htmlFor={`${slide.id}-transition`}
        isOverridden={ov.transitionType !== undefined}
        label="Transition"
        onReset={clearTransition}
      >
        <Select
          onValueChange={(value) => {
            if (value === 'global') clearTransition()
            else setTransition(value as TransitionType)
          }}
          value={ov.transitionType ?? 'global'}
        >
          <SelectTrigger className="w-full" id={`${slide.id}-transition`} size="sm">
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
  )
}
