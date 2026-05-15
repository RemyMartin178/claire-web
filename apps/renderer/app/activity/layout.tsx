export default function ActivityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-full">
      {children}
    </div>
  )
}
