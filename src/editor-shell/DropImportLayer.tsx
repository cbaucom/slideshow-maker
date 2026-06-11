import { useEffect } from 'react'

type Props = {
  enabled: boolean
  onDropFiles: (files: File[]) => void
}

export function DropImportLayer({ enabled, onDropFiles }: Props) {
  useEffect(() => {
    if (!enabled) return

    function handleDragOver(event: DragEvent) {
      if (!event.dataTransfer?.types.includes('Files')) return
      event.preventDefault()
    }

    function handleDrop(event: DragEvent) {
      if (!event.dataTransfer?.types.includes('Files')) return
      event.preventDefault()
      const files = [...event.dataTransfer.files]
      if (files.length > 0) onDropFiles(files)
    }

    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [enabled, onDropFiles])

  return null
}
