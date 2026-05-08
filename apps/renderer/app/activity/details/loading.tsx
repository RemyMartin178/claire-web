import { Skeleton } from '@/components/ui/skeleton'

// Server-rendered skeleton shown while /activity/details streams in. Cluely-style
// layout — date row + actions, big title, tab strip, transcript blocks. The user
// sees this instantly when the recording session ends, instead of a flash of
// /activity before the real session details mount.
export default function ActivityDetailsLoading() {
  return (
    <div className="bg-background text-foreground flex h-full overflow-hidden font-sans">
      <div className="min-h-0 flex-1 overflow-y-auto pb-16">
        <div className="mx-auto w-full max-w-[42rem] px-6 pt-7 pb-6">
          {/* Header: date + action icons */}
          <div className="flex items-start justify-between gap-4">
            <Skeleton className="h-4 w-44" />
            <div className="flex items-center gap-1">
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>

          {/* Title */}
          <Skeleton className="mt-2 h-9 w-[70%]" />

          {/* Tab strip + copy button */}
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="inline-flex self-start gap-1 rounded-lg border border-[#e4e4e7] bg-[#ebebeb] p-1 dark:border-white/10 dark:bg-[#1e1e21]">
              <Skeleton className="h-6 w-16 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-md" />
            </div>
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>

          {/* Content — fake transcript exchanges */}
          <section className="mt-6 space-y-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <article key={i} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton
                  className={`h-4 ${
                    i % 3 === 0 ? 'w-[92%]' : i % 3 === 1 ? 'w-[78%]' : 'w-[64%]'
                  }`}
                />
                {i % 2 === 0 && <Skeleton className="h-4 w-[55%]" />}
              </article>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
