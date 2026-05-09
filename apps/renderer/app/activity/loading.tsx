import { Skeleton } from '@/components/ui/skeleton'

export default function ActivityLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white dark:bg-[#09090b] text-foreground font-body">
      {/* Hero */}
      <div className="shrink-0 border-b border-border/30 bg-muted/50 px-6 py-5">
        <div className="mx-auto w-full max-w-[52rem]">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-10 w-36 rounded-full" />
          </div>
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 min-h-0 overflow-hidden px-6 pb-6">
        <div className="mx-auto h-full w-full max-w-[52rem]">
          <div className="space-y-4 pt-6">
            {[0, 1].map((group) => (
              <section key={group}>
                <Skeleton className="h-3 w-20 mb-3" />
                <ul className="space-y-1">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg px-3 py-2.5">
                      <Skeleton className={`h-4 ${i === 0 ? 'w-[60%]' : i === 1 ? 'w-[45%]' : 'w-[52%]'}`} />
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
        </div>
      </div>
    </div>
  )
}
