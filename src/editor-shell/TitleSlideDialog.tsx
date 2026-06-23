import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { TitleSlide } from '../timeline-core/types'
import type { SlideOverrides } from '../timeline-core'
import { TitleSlideForm } from './TitleSlideForm'

type Props = {
  onClose: () => void
  onOverride: (id: string, overrides: SlideOverrides | undefined) => void
  onUpdate: (id: string, updates: Partial<Pick<TitleSlide, 'heading' | 'subtext' | 'style' | 'durationInFrames'>>) => void
  slide: TitleSlide
}

export function TitleSlideDialog({ onClose, onOverride, onUpdate, slide }: Props) {
  return (
    <Dialog onOpenChange={(open) => { if (!open) onClose() }} open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Title Slide</DialogTitle>
          <DialogDescription className="sr-only">Title slide settings</DialogDescription>
        </DialogHeader>
        <TitleSlideForm onOverride={onOverride} onUpdate={onUpdate} slide={slide} />
      </DialogContent>
    </Dialog>
  )
}
