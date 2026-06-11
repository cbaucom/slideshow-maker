import type { ReactNode } from 'react'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'

type Props = {
  player: ReactNode
  filmstrip: ReactNode | null
  sidebar: ReactNode
}

export function EditorLayout({ player, filmstrip, sidebar }: Props) {
  return (
    <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
      <ResizablePanel id="stage" defaultSize={78} minSize={50}>
        {filmstrip ? (
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel id="player" defaultSize={75} minSize={40}>
              {player}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel id="filmstrip" defaultSize={25} minSize={12} maxSize={45}>
              {filmstrip}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          player
        )}
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel id="sidebar" defaultSize={22} minSize={16} maxSize={35}>
        {sidebar}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
