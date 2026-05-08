import { Skeleton } from '@/components/ui/skeleton'

// Server-rendered skeleton shown during route transitions into /activity.
// Mirrors the real page structure (hero greeting + grouped session rows)
// so the user perceives instant nav instead of a blank screen.
export default function ActivityLoading() {
  return (
    <div className="bg-background min-h-full">
      <div className="mx-auto w-full max-w-3xl px-6 pt-10 pb-16">
        {/* Hero greeting */}
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-3" />
          <Skeleton className="h-4 w-40" />
        </div>

        {/* Grouped session list — two day-groups, three rows each */}
        <div className="space-y-6 pt-6">
          {[0, 1].map((group) => (
            <section key={group}>
              <Skeleton className="h-3 w-24 mb-3" />
              <ul className="space-y-1">
                {[0, 1, 2].map((i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5"
                  >
                    <Skeleton
                      className={`h-3.5 ${
                        i === 0 ? 'w-[60%]' : i === 1 ? 'w-[45%]' : 'w-[52%]'
                      }`}
                    />
                    <div className="flex shrink-0 items-center gap-3">
                      <Skeleton className="h-5 w-10 rounded-full" />
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
  )
}
