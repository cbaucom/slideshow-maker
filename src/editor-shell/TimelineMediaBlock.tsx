import type { MutableRefObject } from 'react'
import { cn } from '@/lib/utils'
import type { Slide } from '../timeline-core/types'
import { isTitleSlide } from '../timeline-core/types'

type Props = {
  currentSlideId: string | null
  dragIndexRef: MutableRefObject<number | null>
  leftPx: number
  onReorder: (fromIndex: number, toIndex: number) => void
  onSlideClick: (id: string) => void
  onToggleExclude: (id: string) => void
  selectedSlideId: string | null
  slide: Slide
  slideIndex: number
  widthPx: number
}

function hasOverrides(slide: Slide): boolean {
  return !!slide.overrides && Object.keys(slide.overrides).length > 0
}

function slideLabel(slide: Slide): string {
  return isTitleSlide(slide) ? slide.heading || 'Title' : slide.filename
}

export function TimelineMediaBlock({
  currentSlideId,
  dragIndexRef,
  leftPx,
  onReorder,
  onSlideClick,
  onToggleExclude,
  selectedSlideId,
  slide,
  slideIndex,
  widthPx,
}: Props) {
  return (
    <li
      className={cn(
        'absolute top-0 flex h-full shrink-0 cursor-grab flex-col gap-1 rounded-md border bg-background p-1 transition-colors hover:border-muted-foreground/60 active:cursor-grabbing',
        slide.excluded && 'opacity-60',
        currentSlideId === slide.id && 'border-transparent ring-2 ring-emerald-500',
        selectedSlideId === slide.id && 'border-transparent ring-2 ring-primary',
      )}
      data-timeline-block=""
      draggable
      onClick={() => onSlideClick(slide.id)}
      onDragEnd={() => { dragIndexRef.current = null }}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={() => { dragIndexRef.current = slideIndex }}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (dragIndexRef.current !== null && dragIndexRef.current !== slideIndex) {
          onReorder(dragIndexRef.current, slideIndex)
        }
        dragIndexRef.current = null
      }}
      style={{ left: leftPx, width: widthPx }}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-sm">
        {isTitleSlide(slide) ? (
          <div
            className="flex h-full w-full items-center justify-center px-1 text-xs font-medium"
            style={{
              background: slide.style === 'dark' ? '#111' : '#f5f5f5',
              color: slide.style === 'dark' ? '#f0f0f0' : '#111',
            }}
          >
            <span className="truncate">{slide.heading.slice(0, 14) || 'T'}</span>
          </div>
        ) : slide.type === 'video' ? (
          <video
            className="h-full w-full object-cover"
            draggable={false}
            muted
            src={slide.blobUrl}
          />
        ) : (
          <img
            alt={slide.filename}
            className="h-full w-full object-cover"
            draggable={false}
            src={slide.blobUrl}
          />
        )}
        {!isTitleSlide(slide) && slide.type === 'video' ? (
          <span className="absolute bottom-1 left-1 rounded-sm bg-black/60 px-1 text-[10px] text-white">▶</span>
        ) : null}
        {isTitleSlide(slide) ? (
          <span className="absolute bottom-1 left-1 rounded-sm bg-blue-600/80 px-1 text-[10px] text-white">T</span>
        ) : null}
        {slide.excluded ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] tracking-wide text-white uppercase">
            excluded
          </div>
        ) : null}
        {hasOverrides(slide) ? (
          <span className="absolute top-1 left-1 text-xs text-amber-400 drop-shadow" title="Has custom settings">★</span>
        ) : null}
        <button
          aria-label={slide.excluded ? `Include ${slideLabel(slide)}` : `Exclude ${slideLabel(slide)}`}
          className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-xs leading-none text-white transition-colors hover:bg-black/90"
          onClick={(event) => {
            event.stopPropagation()
            onToggleExclude(slide.id)
          }}
          title={slide.excluded ? 'Re-include in slideshow' : 'Exclude from slideshow'}
          type="button"
        >
          {slide.excluded ? '+' : '×'}
        </button>
      </div>
      <span className="truncate text-[10px] text-muted-foreground">{slideLabel(slide)}</span>
    </li>
  )
}
