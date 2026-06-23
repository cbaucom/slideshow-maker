import { useRef } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import type { Slide } from '../timeline-core/types'
import { isTitleSlide } from '../timeline-core/types'
import type { TimelineDragRef } from './timelineDrag'
import { finishTimelineDrag, startTimelineDrag } from './timelineDrag'

type Props = {
  currentSlideId: string | null
  dragRef: TimelineDragRef
  leftPx: number
  onMoveToBeginning: (indices: number[]) => void
  onMoveToEnd: (indices: number[]) => void
  onReorderBlock: (fromIndices: number[], toIndex: number) => void
  onSlideSelect: (id: string, event: { metaKey: boolean; seek?: boolean; shiftKey: boolean }) => void
  onToggleExclude: (id: string) => void
  selectedSlideIds: ReadonlySet<string>
  slide: Slide
  slideIndex: number
  slides: Slide[]
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
  dragRef,
  leftPx,
  onMoveToBeginning,
  onMoveToEnd,
  onReorderBlock,
  onSlideSelect,
  onToggleExclude,
  selectedSlideIds,
  slide,
  slideIndex,
  slides,
  widthPx,
}: Props) {
  const clickTimerRef = useRef<number | null>(null)
  const isSelected = selectedSlideIds.has(slide.id)
  const resolvedContextIndices = selectedSlideIds.has(slide.id) && selectedSlideIds.size > 0
    ? slides
      .map((entry, index) => (selectedSlideIds.has(entry.id) ? index : -1))
      .filter((index) => index !== -1)
    : [slideIndex]

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <li
          className={cn(
            'absolute top-0 flex h-full shrink-0 cursor-grab flex-col gap-1 rounded-md border bg-background p-1 transition-colors hover:border-muted-foreground/60 active:cursor-grabbing',
            slide.excluded && 'opacity-60',
            currentSlideId === slide.id && 'border-transparent ring-2 ring-emerald-500',
            isSelected && 'border-transparent ring-2 ring-primary',
          )}
          data-timeline-block=""
          draggable
          onClick={(event) => {
            if (clickTimerRef.current !== null) {
              window.clearTimeout(clickTimerRef.current)
            }

            const metaKey = event.metaKey || event.ctrlKey
            const shiftKey = event.shiftKey

            clickTimerRef.current = window.setTimeout(() => {
              onSlideSelect(slide.id, { metaKey, shiftKey })
              clickTimerRef.current = null
            }, 200)
          }}
          onDoubleClick={(event) => {
            event.preventDefault()
            if (clickTimerRef.current !== null) {
              window.clearTimeout(clickTimerRef.current)
              clickTimerRef.current = null
            }
          }}
          onContextMenu={() => {
            if (!isSelected) {
              onSlideSelect(slide.id, { metaKey: false, seek: false, shiftKey: false })
            }
          }}
          onDragEnd={() => {
            if (clickTimerRef.current !== null) {
              window.clearTimeout(clickTimerRef.current)
              clickTimerRef.current = null
            }
            finishTimelineDrag(dragRef)
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragStart={() => {
            if (clickTimerRef.current !== null) {
              window.clearTimeout(clickTimerRef.current)
              clickTimerRef.current = null
            }
            startTimelineDrag(dragRef, slideIndex, selectedSlideIds, slides)
          }}
          onDrop={(event) => {
            event.preventDefault()
            event.stopPropagation()
            const dragState = finishTimelineDrag(dragRef)
            if (!dragState) return

            const fromIndices = dragState.fromIndices
            const includesTarget = fromIndices.includes(slideIndex)
            if (fromIndices.length === 0 || includesTarget) return

            onReorderBlock(fromIndices, slideIndex)
          }}
          style={{ left: leftPx, width: widthPx }}
        >
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-sm bg-black">
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
                className="max-h-full max-w-full object-contain"
                draggable={false}
                muted
                src={slide.blobUrl}
              />
            ) : (
              <img
                alt={slide.filename}
                className="max-h-full max-w-full object-contain"
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
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => onMoveToBeginning(resolvedContextIndices)}>
          Send to Beginning
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onMoveToEnd(resolvedContextIndices)}>
          Send to End
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => onToggleExclude(slide.id)}>
          {slide.excluded ? 'Include in slideshow' : 'Exclude from slideshow'}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
