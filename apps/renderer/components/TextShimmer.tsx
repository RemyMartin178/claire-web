import type { ReactNode } from 'react'

export default function TextShimmer({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <span className={`claire-text-shimmer ${className}`}>{children}</span>
}
