'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useSharedState } from '@/contexts/SharedStateContext'

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function ActiveRecordingWidget() {
  const { state } = useSharedState()
  const router = useRouter()
  const [elapsed, setElapsed] = useState('0:00')
  const [isStopping, setIsStopping] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isRunning = state?.isListenRunning ?? false
  const session = state?.session ?? null

  useEffect(() => {
    if (!isRunning || !session?.startedAt) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setElapsed('0:00')
      setIsStopping(false)
      return
    }

    const tick = () => setElapsed(formatDuration(Date.now() - session.startedAt))
    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning, session?.startedAt])

  const handleStop = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isStopping) return
    setIsStopping(true)
    await (window as any).api?.dashboard?.stopClaire?.()
  }

  const handleClick = () => {
    if (!session?.id) return
    router.push(`/activity/details?sessionId=${session.id}&title=Session+en+cours&new=1`)
  }

  return (
    <AnimatePresence>
      {isRunning && (
        <motion.div
          key="recording-widget"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.45 }}
          className="pointer-events-none absolute bottom-5 left-5 z-20"
        >
          <section
            className="pointer-events-auto cursor-pointer rounded-xl border border-border bg-card px-2.5 py-2.5 shadow-lg transition duration-200 ease-out hover:scale-[1.03] hover:bg-muted"
            onClick={handleClick}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-sm font-normal text-foreground leading-tight">
                  {/* Mic icon */}
                  <span className="inline-flex size-3.5 items-center justify-center rounded-full bg-primary/15">
                    <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                  </span>
                  <span className="block min-w-[7rem] max-w-[14rem] truncate">
                    Session en cours
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground leading-tight">
                  Enregistrement <span className="mx-1">·</span>
                  <span className="tabular-nums">{elapsed}</span>
                </p>
              </div>

              {/* Stop button */}
              <button
                aria-label={isStopping ? 'Arrêt en cours' : 'Arrêter la session'}
                disabled={isStopping}
                onClick={handleStop}
                className="flex size-7 items-center justify-center rounded-full border border-border bg-background transition hover:bg-muted disabled:opacity-50"
                type="button"
              >
                <span
                  className={`size-2.5 rounded-[2px] bg-destructive ${isStopping ? 'animate-pulse' : ''}`}
                />
              </button>
            </div>
          </section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
