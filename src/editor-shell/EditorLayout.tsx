import type { ReactNode } from 'react'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'

// min-w-0/min-h-0 + overflow-hidden keep panel content from forcing the
// flex layout wider/taller than the panel — without them the player can
// only ever grow.
const PANEL_CLASS = 'min-h-0 min-w-0 overflow-hidden'

type Props = {
  player: ReactNode
  filmstrip: ReactNode | null
  sidebar: ReactNode
}

export function EditorLayout({ player, filmstrip, sidebar }: Props) {
  return (
    <ResizablePanelGroup orientation="horizontal" className="min-h-0 min-w-0 flex-1">
      <ResizablePanel id="stage" defaultSize="78%" minSize="30%" className={PANEL_CLASS}>
        {filmstrip ? (
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel id="player" defaultSize="75%" minSize="20%" className={PANEL_CLASS}>
              {player}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel id="filmstrip" defaultSize="25%" minSize="12%" maxSize="60%" className={PANEL_CLASS}>
              {filmstrip}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          player
        )}
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel id="sidebar" defaultSize="22%" minSize="14%" maxSize="40%" className={PANEL_CLASS}>
        {sidebar}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
