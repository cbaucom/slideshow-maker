import type { GlobalSettings, SlideOverrides } from '../timeline-core'
import type { Slide, TitleSlide } from '../timeline-core/types'
import { isTitleSlide } from '../timeline-core/types'
import { SlideSettingsForm } from './SlideSettingsForm'
import { TitleSlideForm } from './TitleSlideForm'

type Props = {
  globalSettings: GlobalSettings
  onOverride: (id: string, overrides: SlideOverrides | undefined) => void
  onUpdateTitleSlide: (
    id: string,
    updates: Partial<Pick<TitleSlide, 'heading' | 'subtext' | 'style' | 'durationInFrames'>>,
  ) => void
  selectedSlide: Slide
  selectedSlideCount: number
}

function slidePanelTitle(slide: Slide): string {
  return isTitleSlide(slide) ? 'Title slide' : slide.filename
}

export function SelectedSlidePanel({
  globalSettings,
  onOverride,
  onUpdateTitleSlide,
  selectedSlide,
  selectedSlideCount,
}: Props) {
  if (selectedSlideCount > 1) {
    return (
      <p className="text-xs text-muted-foreground">
        {selectedSlideCount} slides selected. Drag to reorder, or right-click for move and exclude options.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="truncate text-xs text-muted-foreground">{slidePanelTitle(selectedSlide)}</p>
      {isTitleSlide(selectedSlide) ? (
        <TitleSlideForm
          onOverride={onOverride}
          onUpdate={onUpdateTitleSlide}
          slide={selectedSlide}
        />
      ) : (
        <SlideSettingsForm
          globalSettings={globalSettings}
          onOverride={onOverride}
          slide={selectedSlide}
        />
      )}
    </div>
  )
}
