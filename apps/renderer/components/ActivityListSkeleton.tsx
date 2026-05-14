import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const WIDTHS = ['w-[60%]', 'w-[45%]', 'w-[52%]', 'w-[38%]']

export function ActivitySessionListSkeleton({
  groupCount = 4,
  className,
}: {
  groupCount?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-4 pt-6', className)}>
      {Array.from({ length: groupCount }).map((_, group) => (
        <section key={group}>
          <Skeleton className="mb-3 h-3 w-20" />
          <ul className="space-y-1">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center justify-between rounded-lg px-3 py-2.5">
                <Skeleton className={cn('h-4', WIDTHS[(group * 3 + i) % WIDTHS.length])} />
                <div className="flex shrink-0 items-center gap-3">
                  <Skeleton className="h-5 w-12 rounded-full" />
                  <Skeleton className="h-3 w-10" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function ActivityPageSkeleton() {
  return (
    <div className="flex min-h-full flex-col bg-white text-foreground font-body dark:bg-[#09090b]">
      <div className="shrink-0 border-b border-border/30 bg-muted/50 px-6 py-5">
        <div className="mx-auto w-full max-w-[52rem]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-10 w-36 rounded-full" />
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pb-6">
        <div className="mx-auto w-full max-w-[52rem]">
          <ActivitySessionListSkeleton />
        </div>
      </div>
    </div>
  )
}
