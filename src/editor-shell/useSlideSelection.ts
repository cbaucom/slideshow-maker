import { useCallback, useState } from 'react'

type SlideSelectionOptions = {
  onClear?: () => void
  slideIds: string[]
}

export function useSlideSelection({ onClear, slideIds }: SlideSelectionOptions) {
  const [selectedSlideIds, setSelectedSlideIds] = useState<ReadonlySet<string>>(() => new Set())
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null)

  const clearSelection = useCallback(() => {
    setSelectedSlideIds(new Set())
    setSelectionAnchorId(null)
    onClear?.()
  }, [onClear])

  const handleSlideSelect = useCallback((
    id: string,
    event: { metaKey: boolean; shiftKey: boolean },
  ) => {
    if (event.shiftKey) {
      const anchorId = selectionAnchorId ?? id
      const anchorIndex = slideIds.indexOf(anchorId)
      const targetIndex = slideIds.indexOf(id)
      if (anchorIndex === -1 || targetIndex === -1) return

      const start = Math.min(anchorIndex, targetIndex)
      const end = Math.max(anchorIndex, targetIndex)
      const rangeIds = slideIds.slice(start, end + 1)
      setSelectedSlideIds(new Set(rangeIds))
      setSelectionAnchorId(anchorId)
      return
    }

    if (event.metaKey) {
      setSelectedSlideIds((previous) => {
        const next = new Set(previous)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
      setSelectionAnchorId(id)
      return
    }

    setSelectedSlideIds((previous) => {
      if (previous.size === 1 && previous.has(id)) {
        return new Set()
      }
      return new Set([id])
    })
    setSelectionAnchorId(id)
  }, [selectionAnchorId, slideIds])

  return {
    clearSelection,
    handleSlideSelect,
    selectedSlideIds,
    selectionAnchorId,
    setSelectedSlideIds,
  }
}
