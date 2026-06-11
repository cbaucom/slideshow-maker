import { Button } from '@/components/ui/button'
import type { RecentProject } from '../project-store'

type Props = {
  recentProjects: RecentProject[]
  onOpenRecent: (project: RecentProject) => void
}

export function EmptyState({ recentProjects, onOpenRecent }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <p className="text-muted-foreground">
        Pick a folder containing photos and videos to get started.
      </p>
      {recentProjects.length > 0 && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">Recent projects:</p>
          <ul className="flex flex-col items-stretch gap-1.5">
            {recentProjects.map((p) => (
              <li key={p.name} className="flex">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onOpenRecent(p)}
                >
                  {p.name}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
