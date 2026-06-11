import { Player } from '@remotion/player'
import type { RenderPlan } from '../sequence-planner'
import { SlideshowComposition } from '../composition'

export const FPS = 30
export const COMP_WIDTH = 1920
export const COMP_HEIGHT = 1080

type Props = {
  renderPlan: RenderPlan
  totalFrames: number
}

export function PlayerPane({ renderPlan, totalFrames }: Props) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 items-center justify-center overflow-hidden bg-black p-3">
      <Player
        component={SlideshowComposition}
        durationInFrames={totalFrames}
        compositionWidth={COMP_WIDTH}
        compositionHeight={COMP_HEIGHT}
        fps={FPS}
        inputProps={{ plan: renderPlan }}
        controls
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
