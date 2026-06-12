import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EXPORT_FORMATS, type ExportFormat } from '../composition'
import type { RenderPlan } from '../sequence-planner'
import { EXPORTS_DIR, exportFilename } from '../project-store'

const FORMAT_LABELS: Record<ExportFormat, string> = {
  mp4: 'MP4 video (H.264) — plays everywhere',
  webm: 'WebM video (VP9) — smaller files',
  mp3: 'MP3 audio only — soundtrack mix',
}

const DESTINATION_LABELS = {
  'project-folder': `Project folder (${EXPORTS_DIR}/)`,
  'choose-location': 'Choose where to save…',
} as const

type Destination = keyof typeof DESTINATION_LABELS

type ExportState =
  | { phase: 'configure' }
  | { phase: 'rendering'; progress: number }
  | { phase: 'saving' }
  | { phase: 'done'; savedTo: string }
  | { phase: 'error'; message: string; blob: Blob | null }

type Props = {
  fps: number
  height: number
  onClose: () => void
  onSaveVideo: (blob: Blob, extension: string) => Promise<string>
  projectName: string
  renderPlan: RenderPlan
  width: number
}

function formatDuration(totalFrames: number, fps: number): string {
  const totalSeconds = Math.round(totalFrames / fps)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

async function pickSaveTarget(
  format: ExportFormat,
  projectName: string,
): Promise<FileSystemFileHandle | 'cancelled'> {
  const spec = EXPORT_FORMATS[format]
  try {
    return await window.showSaveFilePicker({
      suggestedName: exportFilename(projectName, new Date(), spec.extension),
      types: [{
        accept: { [spec.mimeType]: [`.${spec.extension}`] },
        description: FORMAT_LABELS[format],
      }],
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    throw error
  }
}

async function writeToHandle(handle: FileSystemFileHandle, blob: Blob): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(blob)
  await writable.close()
}

export function ExportDialog({ fps, height, onClose, onSaveVideo, projectName, renderPlan, width }: Props) {
  const [state, setState] = useState<ExportState>({ phase: 'configure' })
  const [format, setFormat] = useState<ExportFormat>('mp4')
  const [destination, setDestination] = useState<Destination>('project-folder')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  async function renderBlob(controller: AbortController): Promise<Blob | null> {
    // Dynamic import keeps @remotion/web-renderer (and its encoders) out of the main bundle.
    const { exportVideo, getExportUnsupportedReason } = await import('../composition/exportVideo')
    const unsupported = await getExportUnsupportedReason(format, width, height)
    if (unsupported) {
      setState({ phase: 'error', message: unsupported, blob: null })
      return null
    }
    try {
      return await exportVideo({
        format,
        fps,
        height,
        onProgress: ({ progress }) => {
          if (!controller.signal.aborted) setState({ phase: 'rendering', progress })
        },
        plan: renderPlan,
        signal: controller.signal,
        width,
      })
    } catch (error) {
      if (!controller.signal.aborted) {
        const message = error instanceof Error ? error.message : 'Export failed'
        setState({ phase: 'error', message, blob: null })
      }
      return null
    }
  }

  async function saveBlob(blob: Blob, fileHandle: FileSystemFileHandle | null) {
    setState({ phase: 'saving' })
    try {
      if (fileHandle) {
        await writeToHandle(fileHandle, blob)
        setState({ phase: 'done', savedTo: fileHandle.name })
      } else {
        const filename = await onSaveVideo(blob, EXPORT_FORMATS[format].extension)
        setState({ phase: 'done', savedTo: `${EXPORTS_DIR}/${filename}` })
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error'
      setState({
        phase: 'error',
        message: `Render finished, but saving failed (${reason}). You can still save it elsewhere.`,
        blob,
      })
    }
  }

  async function handleStart() {
    // Pick the target first — the file picker needs the click gesture.
    let fileHandle: FileSystemFileHandle | null = null
    if (destination === 'choose-location') {
      const picked = await pickSaveTarget(format, projectName)
      if (picked === 'cancelled') return
      fileHandle = picked
    }
    const controller = new AbortController()
    abortRef.current = controller
    setState({ phase: 'rendering', progress: 0 })
    const blob = await renderBlob(controller)
    if (!blob || controller.signal.aborted) return
    await saveBlob(blob, fileHandle)
  }

  async function handleSaveElsewhere(blob: Blob) {
    const picked = await pickSaveTarget(format, projectName)
    if (picked === 'cancelled') return
    await saveBlob(blob, picked)
  }

  const mediaLabel = EXPORT_FORMATS[format].videoCodec
    ? `${width}×${height} ${format.toUpperCase()}`
    : `${format.toUpperCase()} audio`

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
          <DialogDescription>
            {mediaLabel} · {formatDuration(renderPlan.totalFrames, fps)}
          </DialogDescription>
        </DialogHeader>

        {state.phase === 'configure' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="export-format" className="text-xs">Format</Label>
              <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
                <SelectTrigger id="export-format" size="sm" className="w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(EXPORT_FORMATS).map((key) => (
                    <SelectItem key={key} value={key}>{FORMAT_LABELS[key as ExportFormat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="export-destination" className="text-xs">Save to</Label>
              <Select value={destination} onValueChange={(value) => setDestination(value as Destination)}>
                <SelectTrigger id="export-destination" size="sm" className="w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DESTINATION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={handleStart}>Start Export</Button>
            </div>
          </div>
        )}

        {state.phase === 'rendering' && (
          <div className="space-y-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${Math.round(state.progress * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Rendering… {Math.round(state.progress * 100)}%
              </span>
              <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        )}

        {state.phase === 'saving' && (
          <p className="text-sm text-muted-foreground">Saving…</p>
        )}

        {state.phase === 'done' && (
          <div className="space-y-3">
            <p className="text-sm">
              Saved as <code className="rounded bg-muted px-1 py-0.5">{state.savedTo}</code>
            </p>
            <div className="flex justify-end">
              <Button size="sm" onClick={onClose}>Done</Button>
            </div>
          </div>
        )}

        {state.phase === 'error' && (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{state.message}</p>
            <div className="flex justify-end gap-2">
              {state.blob && (
                <Button size="sm" variant="outline" onClick={() => handleSaveElsewhere(state.blob!)}>
                  Save elsewhere…
                </Button>
              )}
              <Button size="sm" onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
