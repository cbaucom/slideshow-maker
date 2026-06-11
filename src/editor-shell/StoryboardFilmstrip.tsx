import { useRef } from 'react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Slide } from '../timeline-core/types'
import { isTitleSlide } from '../timeline-core/types'

type Props = {
  slides: Slide[]
  selectedSlideId: string | null
  onReorder: (fromIndex: number, toIndex: number) => void
  onToggleExclude: (id: string) => void
  onSlideClick: (id: string) => void
}

function hasOverrides(slide: Slide): boolean {
  return !!slide.overrides && Object.keys(slide.overrides).length > 0
}

function slideLabel(slide: Slide): string {
  return isTitleSlide(slide) ? slide.heading || 'Title' : slide.filename
}

export function StoryboardFilmstrip({ slides, selectedSlideId, onReorder, onToggleExclude, onSlideClick }: Props) {
  const dragIndexRef = useRef<number | null>(null)
  const included = slides.filter(s => !s.excluded).length

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <p className="shrink-0 px-3 pt-2 text-xs text-muted-foreground">
        {included === slides.length
          ? `${slides.length} slide${slides.length !== 1 ? 's' : ''}`
          : `${included} / ${slides.length} included`}
      </p>
      <ScrollArea className="min-h-0 flex-1">
        <ul className="flex items-start gap-2 p-3">
          {slides.map((slide, index) => (
            <li
              key={slide.id}
              className={cn(
                'flex w-36 shrink-0 cursor-pointer flex-col gap-1 rounded-md border bg-background p-1.5 transition-colors hover:border-muted-foreground/60',
                slide.excluded && 'opacity-60',
                selectedSlideId === slide.id && 'border-transparent ring-2 ring-primary',
              )}
              draggable
              onDragStart={() => { dragIndexRef.current = index }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
                  onReorder(dragIndexRef.current, index)
                }
                dragIndexRef.current = null
              }}
              onDragEnd={() => { dragIndexRef.current = null }}
              onClick={() => onSlideClick(slide.id)}
            >
              <div className="relative aspect-video w-full overflow-hidden rounded-sm">
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
                    src={slide.blobUrl}
                    className="h-full w-full object-cover"
                    muted
                    draggable={false}
                  />
                ) : (
                  <img
                    src={slide.blobUrl}
                    alt={slide.filename}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                )}
                {!isTitleSlide(slide) && slide.type === 'video' && (
                  <span className="absolute bottom-1 left-1 rounded-sm bg-black/60 px-1 text-[10px] text-white">▶</span>
                )}
                {isTitleSlide(slide) && (
                  <span className="absolute bottom-1 left-1 rounded-sm bg-blue-600/80 px-1 text-[10px] text-white">T</span>
                )}
                {slide.excluded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] tracking-wide text-white uppercase">
                    excluded
                  </div>
                )}
                {hasOverrides(slide) && (
                  <span className="absolute top-1 left-1 text-xs text-amber-400 drop-shadow" title="Has custom settings">★</span>
                )}
                <button
                  className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-xs leading-none text-white transition-colors hover:bg-black/90"
                  onClick={e => { e.stopPropagation(); onToggleExclude(slide.id) }}
                  title={slide.excluded ? 'Re-include in slideshow' : 'Exclude from slideshow'}
                  aria-label={slide.excluded ? `Include ${slideLabel(slide)}` : `Exclude ${slideLabel(slide)}`}
                >
                  {slide.excluded ? '+' : '×'}
                </button>
              </div>
              <span className="truncate text-xs text-muted-foreground">{slideLabel(slide)}</span>
            </li>
          ))}
        </ul>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
