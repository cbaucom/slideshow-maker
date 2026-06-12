import { canRenderMediaOnWeb, renderMediaOnWeb } from '@remotion/web-renderer'
import type { RenderPlan } from '../sequence-planner/types'
import { EXPORT_FORMATS, type ExportFormat } from './exportFormats'
import { SlideshowComposition } from './SlideshowComposition'

const COMPOSITION_ID = 'slideshow'

export type ExportProgress = {
  encodedFrames: number
  progress: number
}

export type ExportVideoOptions = {
  format: ExportFormat
  fps: number
  height: number
  onProgress?: (progress: ExportProgress) => void
  plan: RenderPlan
  signal?: AbortSignal
  width: number
}

/** Returns null when the browser can export this format, otherwise a human-readable reason. */
export async function getExportUnsupportedReason(
  format: ExportFormat,
  width: number,
  height: number,
): Promise<string | null> {
  const spec = EXPORT_FORMATS[format]
  const result = await canRenderMediaOnWeb({
    audioCodec: spec.audioCodec,
    container: spec.container,
    height,
    videoCodec: spec.videoCodec,
    width,
  })
  if (result.canRender) return null
  const errors = result.issues
    .filter((issue) => issue.severity === 'error')
    .map((issue) => issue.message)
  return errors.join(' ') || 'This browser cannot export in this format.'
}

/** Renders the slideshow (picture + soundtrack, ducking applied) to a Blob, in the browser. */
export async function exportVideo({
  format,
  fps,
  height,
  onProgress,
  plan,
  signal,
  width,
}: ExportVideoOptions): Promise<Blob> {
  const spec = EXPORT_FORMATS[format]
  const result = await renderMediaOnWeb({
    audioCodec: spec.audioCodec,
    composition: {
      component: SlideshowComposition,
      defaultProps: { plan },
      durationInFrames: plan.totalFrames,
      fps,
      height,
      id: COMPOSITION_ID,
      width,
    },
    container: spec.container,
    inputProps: { plan },
    // Personal, non-commercial use qualifies for Remotion's free license.
    licenseKey: 'free-license',
    onProgress: onProgress
      ? ({ encodedFrames, progress }) => onProgress({ encodedFrames, progress })
      : undefined,
    signal,
    videoCodec: spec.videoCodec,
  })
  return result.getBlob()
}
