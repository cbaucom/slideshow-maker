import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { MediaSlide } from '../timeline-core/types'
import type { GlobalSettings, SlideOverrides } from '../timeline-core'
import { SlideSettingsForm } from './SlideSettingsForm'

type Props = {
  globalSettings: GlobalSettings
  onClose: () => void
  onOverride: (id: string, overrides: SlideOverrides | undefined) => void
  slide: MediaSlide
}

export function SlideSettingsDialog({ globalSettings, onClose, onOverride, slide }: Props) {
  return (
    <Dialog onOpenChange={(open) => { if (!open) onClose() }} open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{slide.filename}</DialogTitle>
          <DialogDescription className="sr-only">
            Per-slide setting overrides for {slide.filename}
          </DialogDescription>
        </DialogHeader>
        <SlideSettingsForm globalSettings={globalSettings} onOverride={onOverride} slide={slide} />
      </DialogContent>
    </Dialog>
  )
}
