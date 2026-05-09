'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { pageview } from '@/lib/gtag'
import { posthogPageview } from '@/lib/posthog'

function AnalyticsInner() {
    const pathname = usePathname()
    const searchParams = useSearchParams()

    useEffect(() => {
        const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
        pageview(url)
        posthogPageview(url)
    }, [pathname, searchParams])

    return null
}

export default function Analytics() {
    return (
        <Suspense fallback={null}>
            <AnalyticsInner />
        </Suspense>
    )
}
