export type AspectRatio = '16:9' | '9:16' | '1:1'

export const DEFAULT_ASPECT_RATIO: AspectRatio = '16:9'

export type CanvasDimensions = {
  width: number
  height: number
}

export function dimensionsForAspectRatio(ratio: AspectRatio): CanvasDimensions {
  switch (ratio) {
    case '16:9':
      return { width: 1920, height: 1080 }
    case '9:16':
      return { width: 1080, height: 1920 }
    case '1:1':
      return { width: 1080, height: 1080 }
  }
}
