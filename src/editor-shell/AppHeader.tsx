import { Button } from '@/components/ui/button'

type Props = {
  folderOpen: boolean
  loading: boolean
  onPickFolder: () => void
  onRefresh: () => void
}

export function AppHeader({ folderOpen, loading, onPickFolder, onRefresh }: Props) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-2">
      <h1 className="text-base font-semibold">Slideshow Maker</h1>
      <div className="flex gap-2">
        <Button size="sm" onClick={onPickFolder} disabled={loading}>
          Open Folder
        </Button>
        {folderOpen && (
          <Button size="sm" variant="outline" onClick={onRefresh} disabled={loading}>
            Refresh
          </Button>
        )}
      </div>
    </header>
  )
}
