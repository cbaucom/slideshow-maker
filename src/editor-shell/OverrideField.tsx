import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type Props = {
  label: string
  htmlFor?: string
  children: ReactNode
  isOverridden?: boolean
  defaultHint?: string
  onReset?: () => void
}

export function OverrideField({ label, htmlFor, children, isOverridden = false, defaultHint, onReset }: Props) {
  return (
    <div className="grid grid-cols-[7rem_1fr_3rem] items-center gap-2">
      <Label htmlFor={htmlFor} className="text-xs">{label}</Label>
      <div className="flex min-w-0 items-center gap-2">{children}</div>
      <div className="flex justify-end">
        {isOverridden && onReset ? (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onReset}
            title="Reset to global"
            aria-label={`Reset ${label}`}
          >
            ↩
          </Button>
        ) : defaultHint ? (
          <span className="text-xs text-muted-foreground">{defaultHint}</span>
        ) : null}
      </div>
    </div>
  )
}
