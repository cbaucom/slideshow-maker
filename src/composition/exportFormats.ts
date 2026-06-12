// Static format table, separate from exportVideo.ts so the editor shell can
// import it without pulling @remotion/web-renderer into the main bundle
// (type-only imports below are erased at compile time).
import type {
  WebRendererAudioCodec,
  WebRendererContainer,
  WebRendererVideoCodec,
} from '@remotion/web-renderer'

export type ExportFormatSpec = {
  audioCodec: WebRendererAudioCodec
  container: WebRendererContainer
  extension: string
  mimeType: string
  /** null = audio-only export (soundtrack + video audio mix, no picture). */
  videoCodec: WebRendererVideoCodec | null
}

export const EXPORT_FORMATS = {
  // mp4/h264/aac: the widest-compatibility target for sharing and TV playback.
  mp4: { audioCodec: 'aac', container: 'mp4', extension: 'mp4', mimeType: 'video/mp4', videoCodec: 'h264' },
  webm: { audioCodec: 'opus', container: 'webm', extension: 'webm', mimeType: 'video/webm', videoCodec: 'vp9' },
  mp3: { audioCodec: 'mp3', container: 'mp3', extension: 'mp3', mimeType: 'audio/mpeg', videoCodec: null },
} as const satisfies Record<string, ExportFormatSpec>

export type ExportFormat = keyof typeof EXPORT_FORMATS
